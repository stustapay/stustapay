from hashlib import sha256
from uuid import UUID

from sftkit.database import Connection
from sftkit.error import AccessDenied

from stustapay.core.schema.customer import Customer
from stustapay.core.schema.tree import Node


def hash_shared_topup_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


async def fetch_customer(*, conn: Connection, node: Node, customer_id: int) -> Customer:
    return await conn.fetch_one(
        Customer,
        "select c.* from customer c where c.id = $1 and c.node_id = any($2)",
        customer_id,
        node.ids_to_event_node,
    )


async def reset_customer_payout_info(*, conn: Connection, customer_account_ids: list[int]) -> None:
    if not customer_account_ids:
        return

    await conn.execute(
        "update customer_info set "
        "   iban = null, "
        "   account_name = null, "
        "   email = null, "
        "   donation = 0, "
        "   donate_all = false, "
        "   has_entered_info = false "
        "where customer_account_id = any($1)",
        customer_account_ids,
    )


async def fetch_customer_portal_event_node_id(*, conn: Connection, base_url: str) -> int | None:
    return await conn.fetchval(
        "select n.id from node n join event e on n.event_id = e.id where e.customer_portal_url = $1",
        base_url,
    )


async def fetch_shared_topup_link(
    *,
    conn: Connection,
    token: str,
    customer_portal_base_url: str | None = None,
    order_uuid: UUID | None = None,
    require_active: bool = True,
):
    if order_uuid is None:
        active_clause = "and stl.revoked_at is null and (stl.expires_at is null or stl.expires_at > now())"
        if not require_active:
            active_clause = ""
        link = await conn.fetchrow(
            "select stl.*, c.node_id, c.user_tag_uid, c.balance, c.is_vip, n.event_node_id "
            "from shared_topup_link stl "
            "join customer c on c.id = stl.customer_account_id "
            "join node n on n.id = c.node_id "
            "where stl.token_hash = $1 "
            f"{active_clause}",
            hash_shared_topup_token(token),
        )
    else:
        link = await conn.fetchrow(
            "select stl.*, sto.customer_account_id, c.node_id, c.user_tag_uid, c.balance, c.is_vip, n.event_node_id "
            "from shared_topup_order sto "
            "join shared_topup_link stl on stl.id = sto.link_id "
            "join customer c on c.id = sto.customer_account_id "
            "join node n on n.id = c.node_id "
            "where stl.token_hash = $1 "
            "  and sto.order_uuid = $2",
            hash_shared_topup_token(token),
            order_uuid,
        )
    if link is None:
        raise AccessDenied("Invalid shared topup link")

    if customer_portal_base_url is not None:
        portal_event_node_id = await fetch_customer_portal_event_node_id(
            conn=conn,
            base_url=customer_portal_base_url,
        )
        if portal_event_node_id is None or portal_event_node_id != link["event_node_id"]:
            raise AccessDenied("Shared topup link does not match current customer portal")

    return link


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
