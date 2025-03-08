from typing import Optional

from sftkit.database import Connection

from stustapay.core.schema.till import (
    CashRegister,
    NewCashRegister,
    NewTill,
    Till,
)
from stustapay.core.schema.tree import Node
from stustapay.core.service.common.error import InvalidArgument


async def create_till(*, conn: Connection, node_id: int, till: NewTill) -> Till:
    return await conn.fetch_one(
        Till,
        "insert into till "
        "   (name, description, active_shift, active_profile_id, node_id, terminal_id) "
        "values ($1, $2, $3, $4, $5, $6) returning id, name, description, "
        "   tse_id, active_shift, active_profile_id, z_nr, node_id, terminal_id",
        till.name,
        till.description,
        till.active_shift,
        till.active_profile_id,
        node_id,
        till.terminal_id,
    )


async def fetch_till(*, conn: Connection, node: Node, till_id: int) -> Optional[Till]:
    return await conn.fetch_maybe_one(
        Till,
        "select t.* from till_with_cash_register t join node n on t.node_id = n.id "
        "where t.id = $1 and (n.id = any($2) or $3 = any(n.parent_ids))",
        till_id,
        node.ids_to_event_node,
        node.id,
    )


async def fetch_virtual_till(*, conn: Connection, node: Node) -> Till:
    return await conn.fetch_one(
        Till, "select * from till_with_cash_register where is_virtual and node_id = any($1)", node.ids_to_event_node
    )


async def get_cash_register(conn: Connection, node: Node, register_id: int) -> CashRegister:
    return await conn.fetch_one(
        CashRegister,
        "select * from cash_register_with_cashier where id = $1 and node_id = any($2)",
        register_id,
        node.ids_to_event_node,
    )


async def create_cash_register(*, conn: Connection, node: Node, new_register: NewCashRegister) -> CashRegister:
    account_id = await conn.fetchval(
        "insert into account (type, name, node_id) values ('cash_register', 'Cash Register', $1) returning id",
        node.event_node_id,
    )
    register_id = await conn.fetchval(
        "insert into cash_register (node_id, name, account_id) values ($1, $2, $3) returning id",
        node.id,
        new_register.name,
        account_id,
    )
    register = await get_cash_register(conn=conn, node=node, register_id=register_id)
    return register


async def get_cash_register_account_id(*, conn: Connection, node: Node, cash_register_id: int) -> int:
    acc_id = await conn.fetchval(
        "select account_id from cash_register where id = $1 and node_id = any($2)",
        cash_register_id,
        node.ids_to_event_node,
    )
    if acc_id is None:
        raise InvalidArgument("Cash Register not found")
    return acc_id
