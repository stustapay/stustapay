import logging
from datetime import timedelta
from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.terminal import (
    CurrentTerminal,
    NewTerminal,
    Terminal,
    TerminalButton,
    TerminalConfig,
    TerminalRegistrationSuccess,
    TerminalSecrets,
    TerminalTillConfig,
    UserTagSecret,
)
from stustapay.core.schema.till import Till, TillProfile
from stustapay.core.schema.tree import Node, ObjectType, RestrictedEventSettings
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService, TerminalTokenMetadata
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import AccessDenied, NotFound
from stustapay.core.service.till.till import (
    assign_till_to_terminal,
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
    async def create_terminal(self, *, conn: Connection, node: Node, terminal: NewTerminal) -> Terminal:
        terminal_id = await conn.fetchval(
            "insert into terminal (node_id, name, description) values ($1, $2, $3) returning id",
            node.id,
            terminal.name,
            terminal.description,
        )
        t = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert t is not None
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
        self, *, conn: Connection, node: Node, terminal_id: int, terminal: NewTerminal
    ) -> Terminal:
        term_id = await conn.fetchval(
            "update terminal set name = $1, description = $2 where id = $3 and node_id = $4 returning id",
            terminal.name,
            terminal.description,
            terminal_id,
            node.id,
        )
        if term_id is None:
            raise NotFound(element_typ="terminal", element_id=terminal_id)
        updated_terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        assert updated_terminal is not None
        return updated_terminal

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def delete_terminal(self, *, conn: Connection, node: Node, terminal_id: int) -> bool:
        result = await conn.execute("delete from terminal where id = $1 and node_id = $2", terminal_id, node.id)
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
        row = await conn.fetchrow(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null "
            "where id = $1 and node_id = $2 returning id",
            terminal_id,
            node.id,
        )
        if row is None:
            raise NotFound(element_typ="terminal", element_id=terminal_id)

        till_id = await conn.fetchval("select id from till where terminal_id = $1", terminal_id)
        if till_id is not None:
            till_node_id = await conn.fetchval("select node_id from till where id = $1", till_id)
            await remove_terminal_from_till(conn=conn, node_id=till_node_id, till_id=till_id)

        return True

    @with_db_transaction
    @requires_node(object_types=[ObjectType.terminal])
    @requires_user([Privilege.node_administration])
    async def switch_till(self, *, conn: Connection, node: Node, terminal_id: int, new_till_id: int):
        terminal = await _fetch_terminal(conn=conn, node=node, terminal_id=terminal_id)
        if terminal is None:
            raise NotFound(element_typ="terminal", element_id=terminal_id)
        if terminal.till_id is not None:
            till_node_id = await conn.fetchval("select node_id from till where id = $1", terminal.till_id)
            await remove_terminal_from_till(conn=conn, node_id=till_node_id, till_id=terminal.till_id)

        await assign_till_to_terminal(conn=conn, node=node, till_id=new_till_id, terminal_id=terminal_id)

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

    async def _get_terminal_till_config(self, conn: Connection, terminal_id: int, till: Till) -> TerminalTillConfig:
        node = await fetch_node(conn=conn, node_id=till.node_id)
        assert node is not None
        event_node = await fetch_event_node_for_node(conn=conn, node_id=node.id)
        assert event_node is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
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

        user_privileges = await conn.fetchval(
            "select privileges_at_node as privileges from user_privileges_at_node($1) where node_id = $2",
            till.active_user_id,
            till.node_id,
        )
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

        user_tag_secret = await conn.fetch_one(
            UserTagSecret,
            "select encode(key0, 'hex') as key0, encode(key1, 'hex') as key1 "
            "from user_tag_secret "
            "where node_id = any($1) "
            "limit 1",
            node.ids_to_event_node,
        )
        sumup_affiliate_key = ""
        sumup_api_oauth_token = ""
        sumup_api_oauth_valid_until = None
        if event_settings.sumup_payment_enabled and (profile.allow_ticket_sale or profile.allow_top_up):
            sumup_affiliate_key = event_settings.sumup_affiliate_key
            oauth_token = await self._get_terminal_sumup_oauth_token(
                terminal_id=terminal_id, node=node, event_settings=event_settings
            )
            sumup_api_oauth_token = oauth_token.access_token if oauth_token is not None else ""
            sumup_api_oauth_valid_until = oauth_token.expires_at if oauth_token is not None else None

        secrets = TerminalSecrets(
            sumup_affiliate_key=sumup_affiliate_key,
            sumup_api_key=sumup_api_oauth_token,
            sumup_api_key_expires_at=sumup_api_oauth_valid_until,
            user_tag_secret=user_tag_secret,
        )

        available_roles = []
        if till.active_user_id is not None:
            available_roles = await list_assignable_roles_for_user_at_node(
                conn=conn, node=node, user_id=till.active_user_id
            )

        return TerminalTillConfig(
            id=till.id,
            name=till.name,
            event_name=event_node.name,
            description=till.description,
            cash_register_id=cash_register_id,
            cash_register_name=cash_register_name,
            user_privileges=user_privileges,
            profile_name=profile.name,
            allow_top_up=profile.allow_top_up,
            allow_cash_out=profile.allow_cash_out,
            allow_ticket_sale=allow_ticket_sale,
            buttons=buttons,
            secrets=secrets,
            available_roles=available_roles,
            active_user_id=till.active_user_id,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_terminal_config(
        self, *, conn: Connection, current_terminal: CurrentTerminal
    ) -> TerminalConfig | None:
        till_config = None
        if current_terminal.till is not None:
            till_config = await self._get_terminal_till_config(
                conn=conn, terminal_id=current_terminal.id, till=current_terminal.till
            )

        return TerminalConfig(
            id=current_terminal.id,
            name=current_terminal.name,
            description=current_terminal.description,
            till=till_config,
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
        )
