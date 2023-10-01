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
from stustapay.core.service.tree.common import fetch_node
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


async def _create_node(conn: Connection, parent_id: int, new_node: NewNode, event_id: int | None = None) -> Node:
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


async def create_event(conn: Connection, node_id: int, event: NewEvent) -> Node:
    # TODO: tree, create all needed resources, e.g. global accounts which have to and should
    #  only exist at an event node
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

    return await _create_node(conn=conn, parent_id=node_id, new_node=event, event_id=event_id)


class TreeService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user()  # TODO: privilege
    @requires_node()
    async def create_node(self, conn: Connection, node: Node, new_node: NewNode) -> Node:
        return await _create_node(conn=conn, parent_id=node.id, new_node=new_node)

    @with_db_transaction
    @requires_user()  # TODO: privilege
    @requires_node()
    async def create_event(self, conn: Connection, node: Node, event: NewEvent) -> Node:
        return await create_event(conn=conn, node_id=node.id, event=event)

    @with_db_transaction
    @requires_user()
    async def get_tree_for_current_user(self, *, conn: Connection, current_user: CurrentUser) -> Node:
        # TODO: check logic here
        node = await fetch_node(conn=conn, node_id=current_user.node_id)
        assert node is not None
        return node
