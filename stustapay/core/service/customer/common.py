from sftkit.database import Connection

from stustapay.core.schema.customer import Customer
from stustapay.core.schema.tree import Node


async def fetch_customer(*, conn: Connection, node: Node, customer_id: int) -> Customer:
    return await conn.fetch_one(
        Customer,
        "select c.* from customer c where c.id = $1 and c.node_id = any($2)",
        customer_id,
        node.ids_to_event_node,
    )


async def fetch_customer_portal_event_node_id(*, conn: Connection, base_url: str) -> int | None:
    return await conn.fetchval(
        "select n.id from node n join event e on n.event_id = e.id where e.customer_portal_url = $1",
        base_url,
    )


async def is_customer_bound_to_customer_portal_base_url(
    *,
    conn: Connection,
    customer: Customer,
    base_url: str,
) -> bool:
    return bool(
        await conn.fetchval(
            "select exists("
            "    select 1 "
            "    from node customer_node "
            "    join node event_node on event_node.id = customer_node.event_node_id "
            "    join event e on e.id = event_node.event_id "
            "    where customer_node.id = $1 and e.customer_portal_url = $2"
            ")",
            customer.node_id,
            base_url,
        )
    )
