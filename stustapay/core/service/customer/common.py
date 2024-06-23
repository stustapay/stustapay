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
