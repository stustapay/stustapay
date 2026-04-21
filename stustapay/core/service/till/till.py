from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order
from stustapay.core.schema.terminal import CurrentTerminal, Terminal, TerminalMode
from stustapay.core.schema.till import NewTill, Till
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege, format_user_tag_uid
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.till.common import create_till, fetch_till
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.till.register import TillRegisterService
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user import AuthService


async def logout_user_from_terminal(conn: Connection, node_id: int, terminal_id: int):
    result = await conn.fetchval(
        "update terminal set active_user_id = null, active_user_role_id = null "
        "where id = $1 and node_id = $2 returning id",
        terminal_id,
        node_id,
    )
    if result is None:
        raise InvalidArgument("till does not exist")


def _terminal_scope_node_ids(node: Node) -> list[int]:
    if node.ids_to_event_node is not None:
        return node.ids_to_event_node
    return node.ids_to_root


async def _fetch_terminal_for_assignment(conn: Connection, node: Node, terminal_id: int) -> Terminal | None:
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


async def remove_terminal_from_till(conn: Connection, till_id: int):
    result = await conn.fetchrow(
        "select till.id, till.node_id, till.terminal_id, terminal.node_id as terminal_node_id "
        "from till left join terminal on terminal.id = till.terminal_id "
        "where till.id = $1",
        till_id,
    )
    if result is None:
        raise InvalidArgument("till does not exist")
    await conn.fetchval(
        "update till set terminal_id = null where id = $1 returning id",
        till_id,
    )
    terminal_id = result["terminal_id"]
    terminal_node_id = result["terminal_node_id"]
    if terminal_id is not None and terminal_node_id is not None:
        await logout_user_from_terminal(conn=conn, node_id=terminal_node_id, terminal_id=terminal_id)


async def _validate_terminal_assignment(conn: Connection, node: Node, till: Till, terminal_id: int) -> Terminal:
    terminal = await _fetch_terminal_for_assignment(conn=conn, node=node, terminal_id=terminal_id)
    if terminal is None:
        raise NotFound(element_type="terminal", element_id=terminal_id)
    if terminal.node_id != till.node_id:
        raise InvalidArgument("Till and terminal must belong to the same node")
    if terminal.mode != TerminalMode.till:
        raise InvalidArgument("Only till terminals can be assigned to tills")
    if terminal.till_id is not None and terminal.till_id != till.id:
        raise InvalidArgument(f"Terminal {terminal.name} already has a till assigned")
    return terminal


async def assign_till_to_terminal(conn: Connection, node: Node, till_id: int, terminal_id: int):
    till = await fetch_till(conn=conn, node=node, till_id=till_id)
    assert till is not None
    if till.terminal_id is not None:
        raise InvalidArgument(f"Till {till.name} already has a terminal assigned")
    await _validate_terminal_assignment(conn=conn, node=node, till=till, terminal_id=terminal_id)
    await conn.execute("update till set terminal_id = $1 where id = $2", terminal_id, till_id)


async def assign_cash_register_to_till_if_available(conn: Connection, till_id: int, cash_register_id: int):
    # Check if the cash register is already in use by another till
    is_in_use = await conn.fetchval(
        "select exists(select from till where active_cash_register_id = $1 and id != $2) ", 
        cash_register_id, till_id
    )
    if is_in_use:
        return

    # Get the till's node ID to fetch the event node
    till_node_id = await conn.fetchval("select node_id from till where id = $1", till_id)
    if till_node_id is None:
        return
        
    # Get the till's event node
    till_node = await conn.fetchrow(
        "select id, event_node_id from node where id = $1", 
        till_node_id
    )
    if till_node is None:
        return
        
    event_node_id = till_node["event_node_id"] if till_node["event_node_id"] is not None else till_node["id"]
    
    # Check if the cash register belongs to the same event
    cash_register_valid = await conn.fetchval(
        "select exists(select 1 from cash_register cr "
        "join node n on cr.node_id = n.id "
        "where cr.id = $1 and (cr.node_id = $2 OR n.event_node_id = $2))", 
        cash_register_id, event_node_id
    )
    
    if not cash_register_valid:
        return
        
    # All checks passed, assign the cash register to the till
    await conn.execute("update till set active_cash_register_id = $1 where id = $2", cash_register_id, till_id)


class TillService(Service[Config]):
    def __init__(
        self,
        db_pool: asyncpg.Pool,
        config: Config,
        auth_service: AuthService,
    ):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.profile = TillProfileService(db_pool, config, auth_service)
        self.layout = TillLayoutService(db_pool, config, auth_service)
        self.register = TillRegisterService(db_pool, config, auth_service)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_till(self, *, conn: Connection, node: Node, till: NewTill) -> Till:
        created_till = await create_till(conn=conn, node_id=node.id, till=till)
        if till.terminal_id is None:
            return created_till

        await assign_till_to_terminal(conn=conn, node=node, till_id=created_till.id, terminal_id=till.terminal_id)
        updated_till = await fetch_till(conn=conn, node=node, till_id=created_till.id)
        assert updated_till is not None
        return updated_till

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_tills(self, *, node: Node, conn: Connection) -> list[Till]:
        if node.ids_to_event_node is None:
            # If no event node hierarchy, just filter by current node
            return await conn.fetch_many(
                Till,
                "select t.* from till_with_cash_register t join node n on t.node_id = n.id "
                "where (t.node_id = $1 or $1 = any(n.parent_ids)) and not t.is_virtual "
                "order by t.name",
                node.id,
            )
        return await conn.fetch_many(
            Till,
            "select t.* from till_with_cash_register t join node n on t.node_id = n.id "
            "where (n.id = any($1) or $2 = any(n.parent_ids)) and not t.is_virtual "
            "order by t.name",
            node.ids_to_event_node,
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_till(self, *, conn: Connection, node: Node, till_id: int) -> Optional[Till]:
        return await fetch_till(conn=conn, node=node, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_till(self, *, conn: Connection, node: Node, till_id: int, till: NewTill) -> Till:
        existing_till = await fetch_till(conn=conn, node=node, till_id=till_id)
        if existing_till is None:
            raise NotFound(element_type="till", element_id=till_id)

        row = await conn.fetchrow(
            "update till set name = $2, description = $3, active_shift = $4, active_profile_id = $5 "
            "where id = $1 and node_id = $6 returning id",
            till_id,
            till.name,
            till.description,
            till.active_shift,
            till.active_profile_id,
            existing_till.node_id,
        )
        if row is None:
            raise NotFound(element_type="till", element_id=till_id)

        if existing_till.terminal_id != till.terminal_id:
            if existing_till.terminal_id is not None:
                await remove_terminal_from_till(conn=conn, till_id=till_id)
            if till.terminal_id is not None:
                await assign_till_to_terminal(conn=conn, node=node, till_id=till_id, terminal_id=till.terminal_id)

        updated_till = await fetch_till(conn=conn, node=node, till_id=till_id)
        assert updated_till is not None
        return updated_till

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_till(self, *, conn: Connection, node: Node, till_id: int) -> bool:
        result = await conn.execute("delete from till where id = $1 and node_id = $2", till_id, node.id)
        return result != "DELETE 0"

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def remove_from_terminal(self, *, conn: Connection, node: Node, till_id: int):
        del node
        await remove_terminal_from_till(conn=conn, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def switch_terminal(self, *, conn: Connection, node: Node, till_id: int, new_terminal_id: int):
        await remove_terminal_from_till(conn=conn, till_id=till_id)
        await assign_till_to_terminal(conn=conn, node=node, till_id=till_id, terminal_id=new_terminal_id)

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_customer(
        self, *, conn: Connection, current_terminal: CurrentTerminal, customer_tag_uid: int
    ) -> Account:
        node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert node is not None
        customer = await conn.fetch_maybe_one(
            Account,
            "select * from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")
        return customer

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.customer_management, Privilege.can_book_orders])
    async def get_customer_orders(
        self, *, conn: Connection, node: Node, current_till: Till, customer_tag_uid: int
    ) -> list[Order]:
        customer_id = await conn.fetchval(
            "select id from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer_id is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")

        orders = await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered("
            "  (select array_agg(o.id) from ordr o where customer_account_id = $1 and till_id = $2), $3"
            ")",
            customer_id,
            current_till.id,
            node.event_node_id,
        )
        return orders
