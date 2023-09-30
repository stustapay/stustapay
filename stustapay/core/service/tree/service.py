import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tree import NewEvent, NewNode, Node
from stustapay.core.schema.user import CurrentUser
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction
from stustapay.core.service.tree.common import fetch_node
from stustapay.framework.database import Connection


class TreeService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user()  # TODO: privilege
    async def create_node(self, conn: Connection, node: NewNode):
        pass

    @with_db_transaction
    @requires_user()  # TODO: privilege
    async def create_event(self, conn: Connection, event: NewEvent) -> Node:
        event_id = await conn.fetchval(
            "insert into event (currency_identifier, sumup_topup_enabled, max_account_balance, ust_id, bon_issuer, "
            "bon_address, bon_title, customer_portal_contact_email, customer_portal_sepa_enabled) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id",
            event.currency_identifier,
            event.sumup_topup_enabled,
            event.max_account_balance,
            event.ust_id,
            event.bon_issuer,
            event.bon_address,
            event.bon_title,
            event.customer_portal_contact_email,
            False,
        )

        node_id = await conn.fetchval(
            "insert into node(parent, name, description, event_id) values ($1, $2, $3, $4)",
            event.parent,
            event.name,
            event.description,
            event_id,
        )
        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        return node

    @with_db_transaction
    @requires_user()
    async def get_tree_for_current_user(self, *, conn: Connection, current_user: CurrentUser) -> Node:
        # TODO: check logic here
        node = await fetch_node(conn=conn, node_id=current_user.node_id)
        assert node is not None
        return node
