import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tree import NewEvent, NewNode, Node, ObjectType
from stustapay.core.schema.user import CurrentUser
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import NotFound
from stustapay.core.service.tree.common import fetch_node, get_tree_for_current_user
from stustapay.framework.database import Connection


async def _update_allowed_objects_in_subtree(conn: Connection, node_id: int, allowed: list[ObjectType]):
    for t in allowed:
        await conn.execute(
            "insert into allowed_objects_in_subtree_at_node (object_name, node_id) values ($1, $2)", t.value, node_id
        )


async def _update_allowed_objects_at_node(conn: Connection, node_id: int, allowed: list[ObjectType]):
    for t in allowed:
        await conn.execute(
            "insert into allowed_objects_at_node (object_name, node_id) values ($1, $2)", t.value, node_id
        )


async def create_node(conn: Connection, parent_id: int, new_node: NewNode, event_id: int | None = None) -> Node:
    new_node_id = await conn.fetchval(
        "insert into node (parent, name, description, event_id) values ($1, $2, $3, $4) returning id",
        parent_id,
        new_node.name,
        new_node.description,
        event_id,
    )
    await _update_allowed_objects_at_node(conn=conn, node_id=new_node_id, allowed=new_node.allowed_objects_at_node)
    await _update_allowed_objects_in_subtree(
        conn=conn, node_id=new_node_id, allowed=new_node.allowed_objects_in_subtree
    )
    result = await fetch_node(conn=conn, node_id=new_node_id)
    assert result is not None
    return result


async def _create_system_accounts(conn: Connection, node_id: int):
    await conn.execute(
        "insert into account (type, name, comment, node_id) values "
        "   ('cash_entry', 'Cash Entry', 'source account when cash enters the system', $1), "
        "   ('cash_exit', 'Cash Exit', 'target account when cash exits the system', $1), "
        "   ('sale_exit', 'Sale Exit', 'target account when sales are made', $1), "
        "   ('sumup_entry', 'Sumup Entry', 'source account when money enters the system via sumup', $1), "
        "   ('sumup_online_entry', 'Sumup Online Entry', 'source account when money enters the system via sumup online payment', $1), "
        "   ('cash_imbalance', 'Cash Imbalanace', 'used to correct cash imbalances, e.g. when closing out cash-handling tills ', $1), "
        "   ('cash_vault', 'Cash Vault', 'represents the cash vault of an event', $1), "
        "   ('cash_topup_source', 'Cash Top Up Source', 'account used when altering customer balances based on cash payments / payouts', $1), "
        "   ('voucher_create', 'Voucher Create', 'Source / Target account for voucher creations / deletions', $1)",
        node_id,
    )


async def create_event(conn: Connection, parent_id: int, event: NewEvent) -> Node:
    # TODO: tree, create all needed resources, e.g. global accounts which have to and should
    #  only exist at an event node
    event_id = await conn.fetchval(
        "insert into event (currency_identifier, sumup_topup_enabled, max_account_balance, ust_id, bon_issuer, "
        "bon_address, bon_title, customer_portal_contact_email, sepa_enabled, sepa_sender_name, sepa_sender_iban, "
        "sepa_description, sepa_allowed_country_codes, customer_portal_url) "
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning id",
        event.currency_identifier,
        event.sumup_topup_enabled,
        event.max_account_balance,
        event.ust_id,
        event.bon_issuer,
        event.bon_address,
        event.bon_title,
        event.customer_portal_contact_email,
        event.sepa_enabled,
        event.sepa_sender_name,
        event.sepa_sender_iban,
        event.sepa_description,
        event.sepa_allowed_country_codes,
        event.customer_portal_url,
    )

    node = await create_node(conn=conn, parent_id=parent_id, new_node=event, event_id=event_id)
    await _create_system_accounts(conn=conn, node_id=node.id)
    return node


class TreeService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user()  # TODO: privilege
    @requires_node()
    async def create_node(self, conn: Connection, node: Node, new_node: NewNode) -> Node:
        return await create_node(conn=conn, parent_id=node.id, new_node=new_node)

    @with_db_transaction
    @requires_user()  # TODO: privilege
    @requires_node()
    async def create_event(self, conn: Connection, node: Node, event: NewEvent) -> Node:
        return await create_event(conn=conn, parent_id=node.id, event=event)

    @with_db_transaction
    @requires_user()  # TODO: privilege
    async def update_event(self, conn: Connection, node_id: int, event: NewEvent) -> Node:
        event_id = await conn.fetchval("select event_id from node where id = $1", node_id)
        if event_id is None:
            raise NotFound(element_typ="event", element_id=node_id)

        await conn.fetchval(
            "update event set currency_identifier = $2, sumup_topup_enabled = $3, max_account_balance = $4, "
            "   customer_portal_contact_email = $5, ust_id = $6, bon_issuer = $7, bon_address = $8, bon_title = $9, "
            "   sepa_enabled = $10, sepa_sender_name = $11, sepa_sender_iban = $12, sepa_description = $13, "
            "   sepa_allowed_country_codes = $14, customer_portal_url = $15 "
            "where id = $1",
            event_id,
            event.currency_identifier,
            event.sumup_topup_enabled,
            event.max_account_balance,
            event.customer_portal_contact_email,
            event.ust_id,
            event.bon_issuer,
            event.bon_address,
            event.bon_title,
            event.sepa_enabled,
            event.sepa_sender_name,
            event.sepa_sender_iban,
            event.sepa_description,
            event.sepa_allowed_country_codes,
            event.customer_portal_url,
        )
        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        return node

    @with_db_transaction
    @requires_user()
    async def get_tree_for_current_user(self, *, conn: Connection, current_user: CurrentUser) -> Node:
        return await get_tree_for_current_user(conn=conn, user_node_id=current_user.node_id)
