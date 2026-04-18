import logging
from datetime import timedelta
from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.entry import EntryArea, EntryAreaConfig
from stustapay.core.schema.terminal import (
    CurrentTerminal,
    HeadwindDeviceMapping,
    HeadwindDeviceMappingWithTerminal,
    NewTerminal,
    Terminal,
    TerminalButton,
    TerminalConfig,
    TerminalMode,
    TerminalRegistrationSuccess,
    TerminalSecrets,
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
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from sftkit.error import AccessDenied, NotFound
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
from stustapay.core.service.sumup_link import resolve_terminal_sumup_access
from stustapay.core.service.user import list_assignable_roles_for_user_at_node
from stustapay.payment.sumup.api import SumUpOAuthToken, fetch_new_oauth_token

logger = logging.getLogger(__name__)


def _terminal_scope_node_ids(node: Node) -> list[int]:
    if node.ids_to_event_node is not None:
        return node.ids_to_event_node
    return node.ids_to_root


async def _fetch_terminal(conn: Connection, node: Node, terminal_id: int) -> Terminal | None:
    scope_node_ids = _terminal_scope_node_ids(node)
    return await conn.fetch_maybe_one(
        Terminal,
        "select t.*, till.id as till_id "
        "from terminal t "
        "left join till on t.id = till.terminal_id "
        "join node n on t.node_id = n.id "
        "where t.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
        terminal_id,
        scope_node_ids,
        node.id,
    )


async def _ensure_entry_area(conn: Connection, node: Node, entry_area_id: int) -> EntryArea:
    scope_node_ids = _terminal_scope_node_ids(node)
    entry_area = await conn.fetch_maybe_one(
        EntryArea,
        "select ea.* "
        "from entry_area ea "
        "join node n on ea.node_id = n.id "
        "where ea.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
        entry_area_id,
        scope_node_ids,
        node.id,
    )
    if entry_area is None:
        raise InvalidArgument(f"Entry area {entry_area_id} does not exist")
    return entry_area


class TerminalService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.sumup_oauth_cache: dict[int, SumUpOAuthToken] = {}

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def create_terminal(self, *, conn: Connection, node: Node, terminal: NewTerminal) -> Terminal:
        if terminal.mode == TerminalMode.till:
            if terminal.entry_area_id is not None:
                raise InvalidArgument("Till terminals cannot be assigned to an entry area")
        else:
            if terminal.entry_area_id is None:
                raise InvalidArgument("Entry terminals must be assigned to an entry area")
            await _ensure_entry_area(conn=conn, node=node, entry_area_id=terminal.entry_area_id)

        terminal_id = await conn.fetchval(
            "insert into terminal (node_id, name, description, mode, entry_area_id) "
            "values ($1, $2, $3, $4, $5) returning id",
            node.id,
            terminal.name,
            terminal.description,
            terminal.mode.value,
            terminal.entry_area_id,
        )
        t = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert t is not None
        return t

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_terminals(self, *, conn: Connection, node: Node) -> list[Terminal]:
        scope_node_ids = _terminal_scope_node_ids(node)
        return await conn.fetch_many(
            Terminal,
            "select t.*, till.id as till_id "
            "from terminal t "
            "left join till on t.id = till.terminal_id "
            "join node n on t.node_id = n.id "
            "where n.id = any($1) or $2 = any(n.parent_ids) "
            "order by t.name",
            scope_node_ids,
            node.id,
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
        self, *, conn: Connection, node: Node, terminal_id: int, terminal: NewTerminal
    ) -> Terminal:
        existing_terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if existing_terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        if terminal.mode == TerminalMode.till:
            if terminal.entry_area_id is not None:
                raise InvalidArgument("Till terminals cannot be assigned to an entry area")
        else:
            if terminal.entry_area_id is None:
                raise InvalidArgument("Entry terminals must be assigned to an entry area")
            await _ensure_entry_area(conn=conn, node=node, entry_area_id=terminal.entry_area_id)
            if existing_terminal.till_id is not None:
                await remove_terminal_from_till(conn=conn, till_id=existing_terminal.till_id)

        term_id = await conn.fetchval(
            "update terminal set name = $1, description = $2, mode = $3, entry_area_id = $4 "
            "where id = $5 and node_id = $6 returning id",
            terminal.name,
            terminal.description,
            terminal.mode.value,
            terminal.entry_area_id,
            terminal_id,
            existing_terminal.node_id,
        )
        if term_id is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)
        updated_terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert updated_terminal is not None
        return updated_terminal

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def delete_terminal(self, *, conn: Connection, node: Node, terminal_id: int) -> bool:
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            return False
        result = await conn.execute("delete from terminal where id = $1 and node_id = $2", terminal_id, terminal.node_id)
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
        return TerminalRegistrationSuccess(terminal=terminal, token=token)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def logout_terminal_id(self, *, conn: Connection, node: Node, terminal_id: int) -> bool:
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        row = await conn.fetchrow(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null "
            "where id = $1 and node_id = $2 returning id",
            terminal_id,
            terminal.node_id,
        )
        if row is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        till_id = await conn.fetchval("select id from till where terminal_id = $1", terminal_id)
        if till_id is not None:
            await remove_terminal_from_till(conn=conn, till_id=till_id)

        return True

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def switch_till(self, *, conn: Connection, node: Node, terminal_id: int, new_till_id: int):
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)
        if terminal.till_id is not None:
            await remove_terminal_from_till(conn=conn, till_id=terminal.till_id)

        await assign_till_to_terminal(conn=conn, node=node, till_id=new_till_id, terminal_id=terminal_id)

    @with_db_transaction
    @requires_terminal(requires_till=False)
    async def logout_terminal(self, *, conn: Connection, current_terminal: CurrentTerminal):
        await conn.fetchval(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1",
            current_terminal.id,
        )
        if current_terminal.till is not None:
            await remove_terminal_from_till(conn=conn, till_id=current_terminal.till.id)

    async def _get_terminal_sumup_oauth_token(
        self, conn: Connection, terminal_id: int, node: Node, event_settings: RestrictedEventSettings
    ) -> SumUpOAuthToken | None:
        del terminal_id
        if not event_settings.sumup_payment_enabled:
            return None
        access = await resolve_terminal_sumup_access(conn=conn, node_id=node.id, event_settings=event_settings)
        if access is None or not access.is_oauth:
            return None

        current_token = self.sumup_oauth_cache.get(access.source_node_id, None)
        if current_token and current_token.is_valid():
            return current_token

        logger.info("Refreshing SumUp OAuth token for node %s via source %s", node.id, access.source_node_id)
        new_token = await fetch_new_oauth_token(
            client_id=access.oauth_client_id,
            client_secret=access.oauth_client_secret,
            refresh_token=access.refresh_token,
        )
        if new_token is None and current_token is not None and current_token.is_valid(tolerance=timedelta(minutes=2)):
            return current_token

        if new_token is None:
            return None

        self.sumup_oauth_cache[access.source_node_id] = new_token
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

        # Get cash register information for the terminal
        cash_register_id = till.active_cash_register_id
        cash_register_name = None
        
        # If we have a cash register ID, verify it exists and get its name
        if cash_register_id is not None:
            cash_reg = await conn.fetchrow(
                "select cr.id, cr.name "
                "from cash_register cr "
                "join node n on cr.node_id = n.id "
                "where cr.id = $1 and (cr.node_id = any($2) OR n.event_node_id = $3)",
                cash_register_id,
                event_node.ids_to_root,
                event_node.id
            )
            
            if cash_reg is not None:
                cash_register_id = cash_reg["id"]
                cash_register_name = cash_reg["name"]
            else:
                # If we didn't find the cash register, set it to None
                cash_register_id = None
                # Update the till to remove the invalid cash register
                await conn.execute(
                    "update till set active_cash_register_id = null where id = $1", 
                    till.id
                )

        sumup_secrets = None
        if event_settings.sumup_payment_enabled:
            access = await resolve_terminal_sumup_access(conn=conn, node_id=node.id, event_settings=event_settings)
            sumup_affiliate_key = access.affiliate_key if access is not None else ""
            oauth_token = await self._get_terminal_sumup_oauth_token(
                conn=conn,
                terminal_id=terminal_id,
                node=node,
                event_settings=event_settings,
            )
            sumup_api_oauth_token = oauth_token.access_token if oauth_token is not None else ""
            sumup_api_oauth_valid_until = oauth_token.expires_at if oauth_token is not None else None
            sumup_secrets = TerminalSumupSecrets(
                sumup_affiliate_key=sumup_affiliate_key,
                sumup_api_key=sumup_api_oauth_token,
                sumup_api_key_expires_at=sumup_api_oauth_valid_until,
            )

        post_payment_allowed = event_settings.post_payment_allowed
        sumup_payment_enabled = event_settings.sumup_payment_enabled

        # Get terminal information for the required fields
        terminal_obj = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        active_user_id = terminal_obj.active_user_id if terminal_obj else None
        
        # Get user privileges
        user_privileges = None
        if active_user_id:
            active_user_role_id = terminal_obj.active_user_role_id if terminal_obj else None
            if active_user_role_id:
                user_role = await conn.fetchrow(
                    "SELECT r.*, COALESCE(privs.privileges, ARRAY[]::text[]) as privileges FROM user_role r "
                    "LEFT JOIN (SELECT ur.role_id, array_agg(ur.privilege) as privileges FROM user_role_to_privilege ur "
                    "GROUP BY ur.role_id) privs ON r.id = privs.role_id WHERE r.id = $1",
                    active_user_role_id,
                )
                if user_role and 'privileges' in user_role:
                    user_privileges = user_role['privileges']
        
        # Get event name
        event_name = event_node.name if event_node else ""
        
        # Get terminal secrets
        secrets = await self._get_terminal_secrets(conn=conn, event_node=event_node)
        
        # Get available roles
        available_roles = []
        if terminal_obj:
            available_roles = await self._get_assignable_roles_for_user_at_node(conn=conn, current_terminal=terminal_obj)

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
            sumup_secrets=sumup_secrets,
            post_payment_allowed=post_payment_allowed,
            sumup_payment_enabled=sumup_payment_enabled,
            # Add the missing required fields
            event_name=event_name,
            user_privileges=user_privileges,
            secrets=secrets,
            active_user_id=active_user_id,
            available_roles=available_roles,
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
        
        # Get event settings to retrieve SumUp information
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=event_node.id)
        
        # Default empty values for SumUp fields
        sumup_affiliate_key = ""
        sumup_api_key = ""
        sumup_api_key_expires_at = None
        
        # If SumUp is enabled, set the affiliate key
        if event_settings and event_settings.sumup_payment_enabled:
            access = await resolve_terminal_sumup_access(conn=conn, node_id=event_node.id, event_settings=event_settings)
            sumup_affiliate_key = access.affiliate_key if access is not None else ""
        
        # Return the combined secrets in the format expected by the Android app
        return TerminalSecrets(
            sumup_affiliate_key=sumup_affiliate_key,
            sumup_api_key=sumup_api_key,
            sumup_api_key_expires_at=sumup_api_key_expires_at,
            user_tag_secret=user_tag_secret,
        )

    @staticmethod
    async def _get_assignable_roles_for_user_at_node(conn: Connection, current_terminal: Terminal | CurrentTerminal):
        available_roles = []
        
        # Check if we have a CurrentTerminal or a regular Terminal object
        if hasattr(current_terminal, 'till') and current_terminal.till is not None:
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
            # If the till doesn't have an active cash register, but the user does,
            # try to assign it now to fix the "no cash register" issue
            user_cash_register_id = None
            if current_terminal.active_user_id is not None:
                user_cash_register_id = await conn.fetchval(
                    "select cash_register_id from usr where id = $1", 
                    current_terminal.active_user_id
                )
                
                # If user has a cash register, verify it's from the same event
                if user_cash_register_id is not None:
                    cash_register_exists = await conn.fetchval(
                        "select exists(select 1 from cash_register cr "
                        "join node n on cr.node_id = n.id "
                        "where cr.id = $1 and (cr.node_id = $2 OR n.event_node_id = $2))", 
                        user_cash_register_id, event_node.id
                    )
                    
                    if cash_register_exists:
                        # Check if till already has an active cash register
                        till_cash_register = await conn.fetchval(
                            "select active_cash_register_id from till where id = $1", 
                            current_terminal.till.id
                        )
                        
                        # If till doesn't have a cash register, assign the user's
                        if till_cash_register is None:
                            await conn.execute(
                                "update till set active_cash_register_id = $1 where id = $2", 
                                user_cash_register_id, 
                                current_terminal.till.id
                            )
            
            till_config = await self._get_terminal_till_config(
                conn=conn, terminal_id=current_terminal.id, till=current_terminal.till, event_node=event_node
            )
        available_roles = await self._get_assignable_roles_for_user_at_node(
            conn=conn, current_terminal=current_terminal
        )

        entry_area = None
        if current_terminal.entry_area_id is not None:
            entry_area_scope_node_ids = _terminal_scope_node_ids(event_node)
            entry_area = await conn.fetch_maybe_one(
                EntryAreaConfig,
                "select ea.id, ea.name, ea.description "
                "from entry_area ea "
                "join node n on ea.node_id = n.id "
                "where ea.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
                current_terminal.entry_area_id,
                entry_area_scope_node_ids,
                event_node.id,
            )

        return TerminalConfig(
            id=current_terminal.id,
            name=current_terminal.name,
            event_name=event_node.name,
            description=current_terminal.description,
            mode=current_terminal.mode,
            entry_area=entry_area,
            user_privileges=user_privileges,
            available_roles=available_roles,
            active_user_id=current_terminal.active_user_id,
            secrets=secrets,
            till=till_config,
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
        )

    @with_db_transaction
    @requires_terminal(requires_till=False)
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
        
        # Get the event node for the terminal
        event_node_id = node.event_node_id
        if event_node_id is None:
            # If we're not in an event, use the node_id
            event_node_id = node.id

        # we fetch all roles that contain either the terminal login or supervised terminal login privilege
        # restricting to users in the same event
        available_roles = await conn.fetch_many(
            UserRole,
            "select urwp.* "
            "from user_role_with_privileges urwp "
            "join user_to_role urt on urwp.id = urt.role_id "
            "join usr on urt.user_id = usr.id "
            "join user_tag ut on usr.user_tag_id = ut.id "
            "join node n on usr.node_id = n.id "
            "where ut.uid = $1 "
            "   and ($2 = any(urwp.privileges) or $3 = any(urwp.privileges)) "
            "   and urt.node_id = any($4) "
            "   and (usr.node_id = $5 OR n.event_node_id = $5)",
            user_tag.uid,
            Privilege.terminal_login.name,
            Privilege.supervised_terminal_login.name,
            node.ids_to_root,
            event_node_id,
        )
        if len(available_roles) == 0:
            raise AccessDenied(
                "User is not known or does not have any assigned roles or the user does not "
                "have permission to login at a terminal"
            )

        # Get user info, making sure we get a user from the same event
        new_user_id = await conn.fetchval(
            "select u.id from user_with_tag u "
            "join node n on u.node_id = n.id "
            "where u.user_tag_uid = $1 and (u.node_id = $2 OR n.event_node_id = $2)",
            user_tag.uid,
            event_node_id
        )
        
        if new_user_id is None:
            raise AccessDenied("User not found in this event")

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
    @requires_terminal(requires_till=False)
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

        # Get the terminal's node and event_node_id
        terminal_node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert terminal_node is not None
        
        # Get the event node for the terminal
        event_node_id = terminal_node.event_node_id
        if event_node_id is None:
            # If we're not in an event, use the node_id
            event_node_id = terminal_node.id

        # Get user_id matching both the tag_uid AND the terminal's event node hierarchy
        user_id, cash_register_id = await conn.fetchrow(
            "select u.id, u.cash_register_id from user_with_tag u "
            "join node n on u.node_id = n.id "
            "where u.user_tag_uid = $1 and (u.node_id = $2 OR n.event_node_id = $2)",
            user_tag.uid, event_node_id
        )
        
        if user_id is None:
            raise AccessDenied("User not found in this event")

        if current_terminal.till is not None:
            await conn.execute("update till set active_cash_register_id = null where id = $1", current_terminal.till.id)

        # Update the terminal to set the active user and role
        await conn.fetchval(
            "update terminal set active_user_id = $1, active_user_role_id = $2 where id = $3 returning id",
            user_id,
            user_role_id,
            current_terminal.id,
        )

        # If user has a cash register and we have a till, assign the cash register to the till
        if current_terminal.till is not None and cash_register_id is not None:
            # First verify the cash register is in the same event as the terminal
            cash_register_exists = await conn.fetchval(
                "select exists(select 1 from cash_register cr "
                "join node n on cr.node_id = n.id "
                "where cr.id = $1 and (cr.node_id = $2 OR n.event_node_id = $2))", 
                cash_register_id, event_node_id
            )
            
            if cash_register_exists:
                await assign_cash_register_to_till_if_available(
                    conn=conn, till_id=current_terminal.till.id, cash_register_id=cash_register_id
                )

        # Directly query for the user information instead of using get_current_user
        user = await conn.fetch_maybe_one(
            CurrentUser,
            """
            SELECT u.*,
                   $2 as active_role_id,
                   ur.name as active_role_name,
                   COALESCE(
                       (SELECT array_agg(DISTINCT p) 
                        FROM (
                            SELECT unnest(privileges) as p
                            FROM user_role_with_privileges
                            WHERE id = $2
                        ) as role_privileges
                       ),
                       ARRAY[]::text[]
                   ) as privileges
            FROM user_with_tag u
            LEFT JOIN user_role ur ON ur.id = $2
            WHERE u.id = $1
            """,
            user_id,
            user_role_id
        )
        
        assert user is not None
        return user

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_current_user(
        self, *, conn: Connection, current_terminal: CurrentTerminal
    ) -> Optional[CurrentUser]:
        """
        Get the user that is currently logged into the terminal
        This is called from the terminal API to get the current user
        """
        if current_terminal.active_user_id is None:
            return None
            
        # Fetch user details and role
        user = await conn.fetch_maybe_one(
            CurrentUser,
            """
            SELECT u.*,
                   t.active_user_role_id as active_role_id,
                   CASE WHEN ur.id IS NOT NULL THEN ur.name ELSE NULL END as active_role_name,
                   COALESCE(
                       (SELECT array_agg(DISTINCT p) 
                        FROM (
                            SELECT unnest(privileges) as p
                            FROM user_role_with_privileges
                            WHERE id = t.active_user_role_id
                        ) as role_privileges
                       ),
                       ARRAY[]::text[]
                   ) as privileges
            FROM user_with_tag u
            JOIN terminal t ON u.id = t.active_user_id
            LEFT JOIN user_role ur ON t.active_user_role_id = ur.id
            WHERE u.id = $1 AND t.id = $2
            """,
            current_terminal.active_user_id,
            current_terminal.id
        )
        
        return user

    @with_db_transaction
    @requires_terminal(requires_till=False)
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
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)
        await logout_user_from_terminal(conn=conn, node_id=terminal.node_id, terminal_id=terminal_id)

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

        # Get the event node for the terminal
        event_node_id = node.event_node_id
        if event_node_id is None:
            # If we're not in an event, use the node_id
            event_node_id = node.id

        # Find the user in the same event as the terminal
        user = await conn.fetch_maybe_one(
            UserInfo,
            """
            select 
                u.*,
                r.id as role_id,
                r.name as role_name,
                cr.balance as cash_drawer_balance,
                transp_a.balance as transport_account_balance,
                cr.id as cash_register_id,
                cr.name as cash_register_name,
                cash_register_id is not null as has_cashregister,
                '[]'::json as assigned_roles
            from user_with_tag u
            join node n on u.node_id = n.id
            left join user_to_role urt on (u.id = urt.user_id)
            left join user_role r on (urt.role_id = r.id and r.node_id = urt.node_id)
            left join account transp_a on transp_a.id = u.transport_account_id
            left join cash_register_with_balance cr on u.cash_register_id = cr.id
            where u.user_tag_uid = $1 and (u.node_id = $2 OR n.event_node_id = $2)
            limit 1
            """,
            user_tag_uid,
            event_node_id,
        )
        if user is None:
            raise NotFound(element_type="user_with_tag", element_id=user_tag_uid)
            
        # Get the assigned roles for the user
        assigned_roles = await conn.fetch_many(
            UserRoleInfo,
            """
            select 
                ur.*,
                utr.node_id,
                n.name as node_name,
                utr.node_id = $3 as is_at_current_node
            from user_role_with_privileges ur
            join user_to_role utr on ur.id = utr.role_id
            join node n on utr.node_id = n.id
            where n.id = any($2) and utr.user_id = $1
            """,
            user.id,
            node.ids_to_root,
            node.id,
        )
        
        # Set the assigned roles
        user.assigned_roles = assigned_roles
  
        return user

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def login_user_to_terminal(
        self,
        *,
        conn: Connection,
        current_user: CurrentUser,
        node: Node,
        terminal_id: int,
        user_id: int,
        role_id: int,
    ) -> Terminal:
        """
        Login a User to a terminal by user_id and role_id from the administration API
        """
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(f"Terminal with id {terminal_id} not found")
            
        # Check if the user has the requested role
        has_role = await conn.fetchval(
            "select exists(select 1 from user_to_role where user_id = $1 and role_id = $2 and node_id = any($3))", 
            user_id, role_id, node.ids_to_root
        )
        
        if not has_role:
            raise AccessDenied("The user does not have the requested role")
            
        # Check if the user exists
        user_exists = await conn.fetchval("select exists(select 1 from usr where id = $1)", user_id)
        
        if not user_exists:
            raise NotFound(f"User with id {user_id} not found")
            
        # Get the cash register id of the user if any
        cash_register_id = await conn.fetchval("select cash_register_id from usr where id = $1", user_id)
        
        # Check if there's a till associated with this terminal
        till = await conn.fetchrow("select * from till where terminal_id = $1", terminal_id)
        
        # If there's a till associated with the terminal and the user has a cash register, update the till
        if till is not None and cash_register_id is not None:
            await conn.execute("update till set active_cash_register_id = null where id = $1", till["id"])
            
        # Update the terminal to set the active user and role
        await conn.execute(
            "update terminal set active_user_id = $1, active_user_role_id = $2 where id = $3",
            user_id,
            role_id,
            terminal_id,
        )
        
        # If there's a till and cash register, assign it
        if till is not None and cash_register_id is not None:
            await assign_cash_register_to_till_if_available(
                conn=conn, till_id=till["id"], cash_register_id=cash_register_id
            )
        

    # region Headwind device mapping helpers

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_headwind_mappings(
        self, *, conn: Connection, node: Node
    ) -> list[HeadwindDeviceMappingWithTerminal]:
        scope_node_ids = _terminal_scope_node_ids(node)
        return await conn.fetch_many(
            HeadwindDeviceMappingWithTerminal,
            "select tdm.*, t.name as terminal_name, t.description as terminal_description "
            "from terminal_device_mapping tdm "
            "join terminal t on t.id = tdm.terminal_id "
            "join node n on tdm.node_id = n.id "
            "where n.id = any($1) or $2 = any(n.parent_ids) "
            "order by t.name asc",
            scope_node_ids,
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_headwind_mapping_for_terminal(
        self, *, conn: Connection, node: Node, terminal_id: int
    ) -> HeadwindDeviceMapping | None:
        scope_node_ids = _terminal_scope_node_ids(node)
        return await conn.fetch_maybe_one(
            HeadwindDeviceMapping,
            "select tdm.* "
            "from terminal_device_mapping tdm "
            "join node n on tdm.node_id = n.id "
            "where tdm.terminal_id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
            terminal_id,
            scope_node_ids,
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_headwind_mapping_with_terminal(
        self, *, conn: Connection, node: Node, terminal_id: int
    ) -> HeadwindDeviceMappingWithTerminal | None:
        scope_node_ids = _terminal_scope_node_ids(node)
        return await conn.fetch_maybe_one(
            HeadwindDeviceMappingWithTerminal,
            "select tdm.*, t.name as terminal_name, t.description as terminal_description "
            "from terminal_device_mapping tdm "
            "join terminal t on t.id = tdm.terminal_id "
            "join node n on tdm.node_id = n.id "
            "where tdm.terminal_id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
            terminal_id,
            scope_node_ids,
            node.id,
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def upsert_headwind_mapping(
        self,
        *,
        conn: Connection,
        node: Node,
        terminal_id: int,
        headwind_device_id: str,
        headwind_device_number: str | None,
        headwind_device_name: str | None,
        headwind_device_serial: str | None,
        headwind_device_model: str | None,
    ) -> HeadwindDeviceMappingWithTerminal:
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        normalized_device_id = str(headwind_device_id)

        existing_for_device = await conn.fetch_maybe_one(
            HeadwindDeviceMapping,
            "select * from terminal_device_mapping where headwind_device_id = $1",
            normalized_device_id,
        )
        if existing_for_device and existing_for_device.terminal_id != terminal_id:
            raise InvalidArgument("Headwind device is already mapped to a different terminal")

        existing_for_terminal = await conn.fetch_maybe_one(
            HeadwindDeviceMapping,
            "select * from terminal_device_mapping where terminal_id = $1",
            terminal_id,
        )

        if existing_for_terminal is None:
            mapping_row = await conn.fetchrow(
                "insert into terminal_device_mapping (terminal_id, node_id, headwind_device_id, "
                "headwind_device_number, headwind_device_name, headwind_device_serial, headwind_device_model) "
                "values ($1, $2, $3, $4, $5, $6, $7) "
                "returning *",
                terminal_id,
                terminal.node_id,
                normalized_device_id,
                headwind_device_number,
                headwind_device_name,
                headwind_device_serial,
                headwind_device_model,
            )
        else:
            mapping_row = await conn.fetchrow(
                "update terminal_device_mapping "
                "set headwind_device_id = $1, "
                "    headwind_device_number = $2, "
                "    headwind_device_name = $3, "
                "    headwind_device_serial = $4, "
                "    headwind_device_model = $5, "
                "    last_token_pushed_at = null, "
                "    last_push_status = null, "
                "    last_push_error = null, "
                "    last_wifi_pushed_at = null, "
                "    last_wifi_push_status = null, "
                "    last_wifi_push_error = null, "
                "    updated_at = now() "
                "where id = $6 "
                "returning *",
                normalized_device_id,
                headwind_device_number,
                headwind_device_name,
                headwind_device_serial,
                headwind_device_model,
                existing_for_terminal.id,
            )

        return await conn.fetch_one(
            HeadwindDeviceMappingWithTerminal,
            "select tdm.*, t.name as terminal_name, t.description as terminal_description "
            "from terminal_device_mapping tdm "
            "join terminal t on t.id = tdm.terminal_id "
            "where tdm.id = $1",
            mapping_row["id"],
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def delete_headwind_mapping(
        self, *, conn: Connection, node: Node, terminal_id: int
    ) -> bool:
        mapping = await self.get_headwind_mapping_for_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if mapping is None:
            return False
        deleted = await conn.fetchrow(
            "delete from terminal_device_mapping where id = $1 returning id",
            mapping.id,
        )
        return deleted is not None

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def issue_headwind_terminal_token(
        self, *, conn: Connection, node: Node, terminal_id: int
    ) -> tuple[str, Terminal]:
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        session_uuid = await conn.fetchval(
            "update terminal set session_uuid = gen_random_uuid(), registration_uuid = null "
            "where id = $1 returning session_uuid",
            terminal_id,
        )
        if session_uuid is None:
            raise NotFound(element_type="terminal", element_id=terminal_id)

        token = self.auth_service.create_terminal_access_token(
            TerminalTokenMetadata(terminal_id=terminal_id, session_uuid=session_uuid)
        )
        return token, terminal

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def record_headwind_push_result(
        self,
        *,
        conn: Connection,
        node: Node,
        mapping_id: int,
        success: bool,
        error_message: str | None,
    ) -> HeadwindDeviceMapping:
        status = "success" if success else "error"
        mapping = await conn.fetch_maybe_one(
            HeadwindDeviceMapping,
            "select tdm.* "
            "from terminal_device_mapping tdm "
            "join node n on tdm.node_id = n.id "
            "where tdm.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
            mapping_id,
            _terminal_scope_node_ids(node),
            node.id,
        )
        if mapping is None:
            raise NotFound(element_type="headwind_mapping", element_id=mapping_id)
        return await conn.fetch_one(
            HeadwindDeviceMapping,
            "update terminal_device_mapping "
            "set last_token_pushed_at = now(), "
            "    last_push_status = $2, "
            "    last_push_error = $3, "
            "    updated_at = now() "
            "where id = $1 "
            "returning *",
            mapping.id,
            status,
            error_message,
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def record_headwind_wifi_push_result(
        self,
        *,
        conn: Connection,
        node: Node,
        mapping_id: int,
        success: bool,
        error_message: str | None,
    ) -> HeadwindDeviceMapping:
        status = "success" if success else "error"
        mapping = await conn.fetch_maybe_one(
            HeadwindDeviceMapping,
            "select tdm.* "
            "from terminal_device_mapping tdm "
            "join node n on tdm.node_id = n.id "
            "where tdm.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
            mapping_id,
            _terminal_scope_node_ids(node),
            node.id,
        )
        if mapping is None:
            raise NotFound(element_type="headwind_mapping", element_id=mapping_id)
        return await conn.fetch_one(
            HeadwindDeviceMapping,
            "update terminal_device_mapping "
            "set last_wifi_pushed_at = now(), "
            "    last_wifi_push_status = $2, "
            "    last_wifi_push_error = $3, "
            "    updated_at = now() "
            "where id = $1 "
            "returning *",
            mapping.id,
            status,
            error_message,
        )

    # endregion
