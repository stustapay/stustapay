import logging
from datetime import timedelta
from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.terminal import (
    CurrentTerminal,
    NewTerminal,
    Terminal,
    TerminalButton,
    TerminalConfig,
    TerminalRegistrationSuccess,
    TerminalSumupSecrets,
    TerminalTillConfig,
    TerminalUserTagSecrets,
    UserTagSecret,
)
from stustapay.core.schema.till import Till, TillProfile, UserInfo, UserRoleInfo
from stustapay.core.schema.tree import Node, ObjectType, RestrictedEventSettings
from stustapay.core.schema.user import (
    CurrentUser,
    Privilege,
    UserRole,
    UserTag,
    format_user_tag_uid,
)
from stustapay.core.service.auth import AuthService, TerminalTokenMetadata
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import AccessDenied, NotFound
from stustapay.core.service.till.till import (
    assign_cash_register_to_till_if_available,
    assign_till_to_terminal,
    logout_user_from_terminal,
    remove_terminal_from_till,
)
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.core.service.user import list_assignable_roles_for_user_at_node
from stustapay.payment.sumup.api import SumUpOAuthToken, fetch_new_oauth_token

logger = logging.getLogger(__name__)


async def _fetch_terminal(conn: Connection, node: Node, terminal_id: int) -> Terminal | None:
    return await conn.fetch_maybe_one(
        Terminal,
        "select t.*, till.id as till_id from terminal t left join till on t.id = till.terminal_id "
        "where t.id = $1 and t.node_id = any($2)",
        terminal_id,
        node.ids_to_root,
    )


class TerminalService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.sumup_oauth_cache: dict[int, SumUpOAuthToken] = {}

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def create_terminal(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, terminal: NewTerminal
    ) -> Terminal:
        terminal_id = await conn.fetchval(
            "insert into terminal (node_id, name, description) values ($1, $2, $3) returning id",
            node.id,
            terminal.name,
            terminal.description,
        )
        t = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert t is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_created,
            content=t,
            user_id=current_user.id,
            node_id=node.id,
        )
        return t

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_terminals(self, *, conn: Connection, node: Node) -> list[Terminal]:
        return await conn.fetch_many(
            Terminal,
            "select t.*, till.id as till_id from terminal t left join till on t.id = till.terminal_id "
            "where t.node_id = any($1) order by t.name",
            node.ids_to_root,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_terminal(self, *, conn: Connection, node: Node, terminal_id: int) -> Optional[Terminal]:
        return await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def update_terminal(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, terminal_id: int, terminal: NewTerminal
    ) -> Terminal:
        term_id = await conn.fetchval(
            "update terminal set name = $1, description = $2 where id = $3 and node_id = $4 returning id",
            terminal.name,
            terminal.description,
            terminal_id,
            node.id,
        )
        if term_id is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)
        updated_terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert updated_terminal is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_updated,
            content=updated_terminal,
            user_id=current_user.id,
            node_id=node.id,
        )
        return updated_terminal

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def delete_terminal(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, terminal_id: int
    ) -> bool:
        result = await conn.execute("delete from terminal where id = $1 and node_id = $2", terminal_id, node.id)
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_deleted,
            content={"id": terminal_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=False)
    async def register_terminal(self, *, conn: Connection, registration_uuid: str) -> TerminalRegistrationSuccess:
        # TODO: TREE visibility
        terminal = await conn.fetch_maybe_one(
            Terminal,
            "select t.*, till.id as till_id "
            "from terminal t "
            "left join till on t.id = till.terminal_id "
            "where registration_uuid = $1",
            registration_uuid,
        )
        if terminal is None:
            raise AccessDenied("Invalid registration uuid")

        session_uuid = await conn.fetchval(
            "update terminal set session_uuid = gen_random_uuid(), registration_uuid = null where id = $1 "
            "returning session_uuid",
            terminal.id,
        )
        token = self.auth_service.create_terminal_access_token(
            TerminalTokenMetadata(terminal_id=terminal.id, session_uuid=session_uuid)
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_registered,
            content={"id": terminal.id},
            user_id=None,
            node_id=terminal.node_id,
        )
        return TerminalRegistrationSuccess(terminal=terminal, token=token)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def logout_terminal_id(self, *, conn: Connection, node: Node, terminal_id: int) -> bool:
        row = await conn.fetchrow(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null "
            "where id = $1 and node_id = $2 returning id",
            terminal_id,
            node.id,
        )
        if row is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        till_id = await conn.fetchval("select id from till where terminal_id = $1", terminal_id)
        if till_id is not None:
            till_node_id = await conn.fetchval("select node_id from till where id = $1", till_id)
            await remove_terminal_from_till(conn=conn, node_id=till_node_id, till_id=till_id)

        return True

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def switch_till(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, terminal_id: int, new_till_id: int
    ):
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)
        if terminal.till_id is not None:
            till_node_id = await conn.fetchval("select node_id from till where id = $1", terminal.till_id)
            await remove_terminal_from_till(conn=conn, node_id=till_node_id, till_id=terminal.till_id)

        await assign_till_to_terminal(conn=conn, node=node, till_id=new_till_id, terminal_id=terminal_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_to_till_changed,
            content={"terminal_id": terminal.id, "old_till_id": terminal.till_id, "new_till_id": new_till_id},
            user_id=current_user.id,
            node_id=terminal.node_id,
        )

    @with_db_transaction
    @requires_terminal(requires_till=False)
    async def logout_terminal(self, *, conn: Connection, current_terminal: CurrentTerminal):
        await conn.fetchval(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1",
            current_terminal.id,
        )
        if current_terminal.till is not None:
            await remove_terminal_from_till(
                conn=conn, node_id=current_terminal.till.node_id, till_id=current_terminal.till.id
            )

    async def _get_terminal_sumup_oauth_token(
        self, terminal_id: int, node: Node, event_settings: RestrictedEventSettings
    ) -> SumUpOAuthToken | None:
        del terminal_id
        if not event_settings.sumup_payment_enabled:
            return None
        if event_settings.sumup_oauth_client_id == "" or event_settings.sumup_oauth_client_secret == "":
            return None

        event_node_id = node.event_node_id
        assert event_node_id is not None

        current_token = self.sumup_oauth_cache.get(event_node_id, None)
        if current_token and current_token.is_valid():
            return current_token

        logger.info(f"Refreshing SumUp Oauth token for event with ID {event_node_id}")
        new_token = await fetch_new_oauth_token(
            client_id=event_settings.sumup_oauth_client_id,
            client_secret=event_settings.sumup_oauth_client_secret,
            refresh_token=event_settings.sumup_oauth_refresh_token,
        )
        if new_token is None and current_token is not None and current_token.is_valid(tolerance=timedelta(minutes=2)):
            return current_token

        if new_token is None:
            return None

        self.sumup_oauth_cache[node.id] = new_token
        return new_token

    async def _get_terminal_till_config(
        self, conn: Connection, terminal_id: int, till: Till, event_node: Node
    ) -> TerminalTillConfig:
        node = await fetch_node(conn=conn, node_id=till.node_id)
        assert node is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=event_node.id)
        profile = await conn.fetch_one(
            TillProfile,
            "select * from till_profile tp where id = $1",
            till.active_profile_id,
        )
        layout_has_tickets = await conn.fetchval(
            "select exists (select from till_layout_to_ticket tltt where layout_id = $1)",
            profile.layout_id,
        )
        allow_ticket_sale = layout_has_tickets and profile.allow_ticket_sale
        allow_ticket_vouchers = allow_ticket_sale and profile.allow_ticket_vouchers

        buttons = await conn.fetch_many(
            TerminalButton,
            "select tlwb.* "
            "from till_button_with_products tlwb "
            "join till_layout_to_button tltb on tltb.button_id = tlwb.id "
            "where tltb.layout_id = $1 "
            "order by tltb.sequence_number asc",
            profile.layout_id,
        )

        cash_register_id = None
        cash_register_name = None
        cash_reg = await conn.fetchrow(
            "select cr.id, cr.name "
            "from cash_register cr "
            "join till t on cr.id = t.active_cash_register_id "
            "where t.id = $1",
            till.id,
        )
        if cash_reg is not None:
            cash_register_id = cash_reg["id"]
            cash_register_name = cash_reg["name"]

        secrets = None
        if event_settings.sumup_payment_enabled and profile.enable_card_payment:
            sumup_affiliate_key = event_settings.sumup_affiliate_key
            oauth_token = await self._get_terminal_sumup_oauth_token(
                terminal_id=terminal_id, node=node, event_settings=event_settings
            )
            sumup_api_oauth_token = oauth_token.access_token if oauth_token is not None else ""
            sumup_api_oauth_valid_until = oauth_token.expires_at if oauth_token is not None else None

            secrets = TerminalSumupSecrets(
                sumup_affiliate_key=sumup_affiliate_key,
                sumup_api_key=sumup_api_oauth_token,
                sumup_api_key_expires_at=sumup_api_oauth_valid_until,
            )

        return TerminalTillConfig(
            id=till.id,
            name=till.name,
            description=till.description,
            cash_register_id=cash_register_id,
            cash_register_name=cash_register_name,
            profile_name=profile.name,
            allow_top_up=profile.allow_top_up,
            allow_cash_out=profile.allow_cash_out,
            allow_ticket_sale=allow_ticket_sale,
            allow_ticket_vouchers=allow_ticket_vouchers,
            enable_ssp_payment=profile.enable_ssp_payment,
            enable_cash_payment=profile.enable_cash_payment,
            enable_card_payment=profile.enable_card_payment,
            buttons=buttons,
            sumup_secrets=secrets,
        )

    @staticmethod
    async def _get_terminal_secrets(conn: Connection, event_node: Node):
        user_tag_secret = await conn.fetch_one(
            UserTagSecret,
            "select encode(key0, 'hex') as key0, encode(key1, 'hex') as key1 "
            "from user_tag_secret "
            "where node_id = $1 "
            "limit 1",
            event_node.id,
        )
        return TerminalUserTagSecrets(
            user_tag_secret=user_tag_secret,
        )

    @staticmethod
    async def _get_assignable_roles_for_user_at_node(conn: Connection, current_terminal: CurrentTerminal):
        available_roles = []
        if current_terminal.till is not None:
            node = await fetch_node(conn=conn, node_id=current_terminal.till.node_id)
        else:
            node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert node is not None

        if current_terminal.active_user_id is not None:
            available_roles = await list_assignable_roles_for_user_at_node(
                conn=conn, node=node, user_id=current_terminal.active_user_id
            )
        return available_roles

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_terminal_config(
        self, *, conn: Connection, current_terminal: CurrentTerminal
    ) -> TerminalConfig | None:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_terminal.node_id)
        assert event_node is not None

        user_privileges = await conn.fetchval(
            "select privileges_at_node as privileges from user_privileges_at_node($1) where node_id = $2",
            current_terminal.active_user_id,
            current_terminal.node_id,
        )

        secrets = await self._get_terminal_secrets(conn=conn, event_node=event_node)

        till_config = None
        if current_terminal.till is not None:
            till_config = await self._get_terminal_till_config(
                conn=conn, terminal_id=current_terminal.id, till=current_terminal.till, event_node=event_node
            )
        available_roles = await self._get_assignable_roles_for_user_at_node(
            conn=conn, current_terminal=current_terminal
        )

        return TerminalConfig(
            id=current_terminal.id,
            name=current_terminal.name,
            event_name=event_node.name,
            description=current_terminal.description,
            user_privileges=user_privileges,
            available_roles=available_roles,
            active_user_id=current_terminal.active_user_id,
            secrets=secrets,
            till=till_config,
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def check_user_login(
        self,
        *,
        node: Node,
        conn: Connection,
        current_user: CurrentUser,
        user_tag: UserTag,
    ) -> list[UserRole]:
        """
        Check if a user can log in to the terminal and return the available roles he can log in as
        """

        # we fetch all roles that contain either the terminal login or supervised terminal login privilege
        available_roles = await conn.fetch_many(
            UserRole,
            "select urwp.* "
            "from user_role_with_privileges urwp "
            "join user_to_role urt on urwp.id = urt.role_id "
            "join usr on urt.user_id = usr.id "
            "join user_tag ut on usr.user_tag_id = ut.id "
            "where ut.uid = $1 "
            "   and ($2 = any(urwp.privileges) or $3 = any(urwp.privileges)) "
            "   and urt.node_id = any($4)",
            user_tag.uid,
            Privilege.terminal_login.name,
            Privilege.supervised_terminal_login.name,
            node.ids_to_root,
        )
        if len(available_roles) == 0:
            raise AccessDenied(
                "User is not known or does not have any assigned roles or the user does not "
                "have permission to login at a terminal"
            )

        new_user_id = await conn.fetchval("select id from user_with_tag where user_tag_uid = $1", user_tag.uid)
        assert new_user_id is not None

        new_user_is_supervisor = await conn.fetchval(
            "select true from user_privileges_at_node($1) where $2 = any(privileges_at_node) and node_id = $3",
            new_user_id,
            Privilege.terminal_login.name,
            node.id,
        )
        if not new_user_is_supervisor:
            if current_user is None or Privilege.terminal_login not in current_user.privileges:
                raise AccessDenied("You can only be logged in by a supervisor")

        return available_roles

    @with_db_transaction
    @requires_terminal()
    async def login_user(
        self,
        *,
        conn: Connection,
        token: str,
        current_terminal: CurrentTerminal,
        user_tag: UserTag,
        user_role_id: int,
    ) -> CurrentUser:
        """
        Login a User to the terminal, but only if the correct permissions exists:
        wants to log in | allowed to log in
        official        | always
        cashier         | only if official is logged in

        where officials are admins and finanzorgas

        returns the newly logged-in User if successful
        """
        available_roles = await self.check_user_login(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, user_tag=user_tag
        )
        if not any(x.id == user_role_id for x in available_roles):
            raise AccessDenied("The user does not have the requested role")

        user_id, cash_register_id = await conn.fetchrow(
            "select id, cash_register_id from user_with_tag where user_tag_uid = $1", user_tag.uid
        )
        assert user_id is not None
        if current_terminal.till is not None:
            await conn.execute("update till set active_cash_register_id = null where id = $1", current_terminal.till.id)

        await conn.fetchval(
            "update terminal set active_user_id = $1, active_user_role_id = $2 where id = $3 returning id",
            user_id,
            user_role_id,
            current_terminal.id,
        )

        if current_terminal.till is not None and cash_register_id is not None:
            await assign_cash_register_to_till_if_available(
                conn=conn, till_id=current_terminal.till.id, cash_register_id=cash_register_id
            )

        # instead of manually redoing the necessary queries we simply reuse the normal auth decorator
        current_user = await self.get_current_user(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn, token=token
        )
        assert current_user is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.terminal_user_logged_in,
            content={"terminal_id": current_terminal.id, "user_id": current_user.id},
            user_id=current_user.id,
            node_id=current_terminal.node_id,
        )
        return current_user

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def get_current_user(self, *, current_user: Optional[CurrentUser]) -> Optional[CurrentUser]:
        return current_user

    @with_db_transaction
    @requires_terminal()
    async def logout_user(self, *, conn: Connection, current_terminal: CurrentTerminal):
        """
        Logout the currently logged-in user. This is always possible
        """

        if current_terminal.till is not None:
            await conn.execute("update till set active_cash_register_id = null where id = $1", current_terminal.till.id)
        await conn.fetchval(
            "update terminal set active_user_id = null, active_user_role_id = null where id = $1",
            current_terminal.id,
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def force_logout_user(self, *, conn: Connection, node: Node, terminal_id: int):
        await logout_user_from_terminal(conn=conn, node_id=node.id, terminal_id=terminal_id)

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def get_user_info(
        self, *, conn: Connection, current_user: CurrentUser, node: Node, user_tag_uid: int
    ) -> UserInfo:
        if (
            Privilege.node_administration not in current_user.privileges
            and Privilege.user_management not in current_user.privileges
            and Privilege.create_user not in current_user.privileges
            and user_tag_uid != current_user.user_tag_uid
        ):
            raise AccessDenied("cannot retrieve user info for someone other than yourself")

        info = await conn.fetch_maybe_one(
            UserInfo,
            "select "
            "   u.*, "
            "   cr.balance as cash_drawer_balance, "
            "   transp_a.balance as transport_account_balance, "
            "   cr.id as cash_register_id, "
            "   cr.name as cash_register_name,"
            "   '[]'::json as assigned_roles "
            "from user_with_tag u "
            "left join account transp_a on transp_a.id = u.transport_account_id "
            "left join cash_register_with_balance cr on u.cash_register_id = cr.id "
            "where u.user_tag_uid = $1",
            user_tag_uid,
        )
        if info is None:
            raise InvalidArgument(f"There is no user registered for tag {format_user_tag_uid(user_tag_uid)}")

        assigned_roles = await conn.fetch_many(
            UserRoleInfo,
            "select "
            "   ur.*, "
            "   utr.node_id,"
            "   n.name as node_name, "
            "   utr.node_id = $3 as is_at_current_node "
            "from user_role_with_privileges ur "
            "join user_to_role utr on ur.id = utr.role_id "
            "join node n on utr.node_id = n.id "
            "where n.id = any($2) and utr.user_id = $1",
            info.id,
            node.ids_to_root,
            node.id,
        )

        info.assigned_roles = assigned_roles
        return info
