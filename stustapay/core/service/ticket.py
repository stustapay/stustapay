from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.ticket import NewTicket, Ticket
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.common.error import NotFound


async def fetch_ticket(*, conn: Connection, node: Node, ticket_id: int) -> Optional[Ticket]:
    return await conn.fetch_maybe_one(
        Ticket,
        "select * from ticket where id = $1 and node_id = any($2)",
        ticket_id,
        node.ids_to_event_node,
    )


class TicketService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(object_types=[ObjectType.ticket], event_only=True)
    @requires_user([Privilege.node_administration])
    async def create_ticket(self, *, conn: Connection, node: Node, ticket: NewTicket) -> Ticket:
        ticket_metadata_id = await conn.fetchval(
            "insert into product_ticket_metadata (initial_top_up_amount) values ($1) returning id",
            ticket.initial_top_up_amount,
        )

        assert ticket_metadata_id is not None
        ticket_id = await conn.fetchval(
            "insert into product "
            "(node_id, name, price, tax_rate_id, target_account_id, fixed_price, price_in_vouchers, is_locked, "
            "is_returnable, ticket_metadata_id, type) "
            "values ($1, $2, $3, $4, null, true, null, $5, false, $6, 'ticket') "
            "returning id",
            node.id,
            ticket.name,
            ticket.price,
            ticket.tax_rate_id,
            ticket.is_locked,
            ticket_metadata_id,
        )

        for restriction in ticket.restrictions:
            await conn.execute(
                "insert into product_restriction (id, restriction) values ($1, $2)", ticket_id, restriction.name
            )

        created_ticket = await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)
        assert created_ticket is not None
        return created_ticket

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user()
    async def list_tickets(self, *, conn: Connection, node: Node) -> list[Ticket]:
        return await conn.fetch_many(
            Ticket, "select * from ticket where node_id = any($1) order by name", node.ids_to_event_node
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user()
    async def get_ticket(self, *, conn: Connection, node: Node, ticket_id: int) -> Optional[Ticket]:
        return await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.ticket], event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_ticket(self, *, conn: Connection, node: Node, ticket_id: int, ticket: NewTicket) -> Ticket:
        ticket_metadata_id = await conn.fetchval(
            "select ticket_metadata_id from product where type = 'ticket' and id = $1 and node_id = any($2)",
            ticket_id,
            node.ids_to_event_node,
        )
        if ticket_metadata_id is None:
            raise NotFound(element_type="ticket", element_id=ticket_id)

        await conn.execute(
            "update product_ticket_metadata set initial_top_up_amount = $1 where id = $2",
            ticket.initial_top_up_amount,
            ticket_metadata_id,
        )
        await conn.execute(
            "update product set name = $2, is_locked = $3, price = $4, tax_rate_id = $5 where id = $1",
            ticket_id,
            ticket.name,
            ticket.is_locked,
            ticket.price,
            ticket.tax_rate_id,
        )
        await conn.execute("delete from product_restriction where id = $1", ticket_id)
        for restriction in ticket.restrictions:
            await conn.execute(
                "insert into product_restriction (id, restriction) values ($1, $2)", ticket_id, restriction.name
            )

        updated_ticket = await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)
        assert updated_ticket is not None
        return updated_ticket

    @with_db_transaction
    @requires_node(object_types=[ObjectType.ticket], event_only=True)
    @requires_user([Privilege.node_administration])
    async def delete_ticket(self, *, conn: Connection, node: Node, ticket_id: int) -> bool:
        ticket_metadata_id = await conn.fetchval(
            "select ticket_metadata_id from product where id = $1 and node_id = any($2)",
            ticket_id,
            node.ids_to_event_node,
        )
        if ticket_metadata_id is None:
            raise NotFound(element_type="ticket", element_id=ticket_id)

        result = await conn.execute(
            "delete from product where id = $1",
            ticket_id,
        )
        await conn.execute("delete from product_ticket_metadata where id = $1", ticket_metadata_id)
        return result != "DELETE 0"
