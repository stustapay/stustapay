from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.ticket import NewTicket, Ticket
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.framework.database import Connection


async def fetch_ticket(*, conn: Connection, node: Node, ticket_id: int) -> Optional[Ticket]:
    return await conn.fetch_maybe_one(
        Ticket,
        "select * from ticket_with_product where id = $1 and node_id = any($2)",
        ticket_id,
        node.ids_to_event_node,
    )


class TicketService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.product_management])
    @requires_node()
    async def create_ticket(self, *, conn: Connection, node: Node, ticket: NewTicket) -> Ticket:
        # TODO: TREE visibility
        ticket_id = await conn.fetchval(
            "insert into ticket "
            "(node_id, name, description, product_id, initial_top_up_amount, restriction) "
            "values ($1, $2, $3, $4, $5, $6) "
            "returning id",
            node.id,
            ticket.name,
            ticket.description,
            ticket.product_id,
            ticket.initial_top_up_amount,
            ticket.restriction.name if ticket.restriction is not None else None,
        )

        if ticket_id is None:
            raise RuntimeError("ticket should have been created")
        created_ticket = await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)
        assert created_ticket is not None
        return created_ticket

    @with_db_transaction
    @requires_user()
    @requires_node()
    async def list_tickets(self, *, conn: Connection, node: Node) -> list[Ticket]:
        return await conn.fetch_many(
            Ticket, "select * from ticket_with_product where node_id = any($1)", node.ids_to_event_node
        )

    @with_db_transaction
    @requires_user()
    @requires_node()
    async def get_ticket(self, *, conn: Connection, node: Node, ticket_id: int) -> Optional[Ticket]:
        return await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)

    @with_db_transaction
    @requires_user([Privilege.product_management])
    @requires_node()
    async def update_ticket(
        self, *, conn: Connection, node: Node, ticket_id: int, ticket: NewTicket
    ) -> Optional[Ticket]:
        # TODO: TREE visibility
        row = await conn.fetchrow(
            "update ticket set name = $2, description = $3, product_id = $4, initial_top_up_amount = $5, "
            "   restriction = $6 "
            "where id = $1 "
            "returning id",
            ticket_id,
            ticket.name,
            ticket.description,
            ticket.product_id,
            ticket.initial_top_up_amount,
            ticket.restriction.name if ticket.restriction is not None else None,
        )
        if row is None:
            return None

        return await fetch_ticket(conn=conn, node=node, ticket_id=ticket_id)

    @with_db_transaction
    @requires_user([Privilege.product_management])
    @requires_node()
    async def delete_ticket(self, *, conn: Connection, ticket_id: int) -> bool:
        # TODO: TREE visibility
        result = await conn.execute(
            "delete from ticket where id = $1",
            ticket_id,
        )
        return result != "DELETE 0"
