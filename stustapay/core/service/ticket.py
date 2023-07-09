from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.ticket import (
    NewTicket,
    Ticket,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user, UserContext


async def fetch_ticket(*, conn: asyncpg.Connection, ticket_id: int) -> Optional[Ticket]:
    result = await conn.fetchrow("select * from ticket_with_product where id = $1", ticket_id)
    if result is None:
        return None
    return Ticket.parse_obj(result)


class TicketService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.product_management])
    async def create_ticket(self, ctx: UserContext, *, ticket: NewTicket) -> Ticket:
        ticket_id = await ctx.conn.fetchval(
            "insert into ticket "
            "(name, description, product_id, initial_top_up_amount, restriction) "
            "values ($1, $2, $3, $4, $5) "
            "returning id",
            ticket.name,
            ticket.description,
            ticket.product_id,
            ticket.initial_top_up_amount,
            ticket.restriction.name if ticket.restriction is not None else None,
        )

        if ticket_id is None:
            raise RuntimeError("ticket should have been created")
        created_ticket = await fetch_ticket(conn=ctx.conn, ticket_id=ticket_id)
        assert created_ticket is not None
        return created_ticket

    @with_db_transaction
    @requires_user()
    async def list_tickets(self, ctx: UserContext) -> list[Ticket]:
        cursor = ctx.conn.cursor("select * from ticket_with_product")
        result = []
        async for row in cursor:
            result.append(Ticket.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user()
    async def get_ticket(self, ctx: UserContext, *, ticket_id: int) -> Optional[Ticket]:
        return await fetch_ticket(conn=ctx.conn, ticket_id=ticket_id)

    @with_db_transaction
    @requires_user([Privilege.product_management])
    async def update_ticket(self, ctx: UserContext, *, ticket_id: int, ticket: NewTicket) -> Optional[Ticket]:
        row = await ctx.conn.fetchrow(
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

        return await fetch_ticket(conn=ctx.conn, ticket_id=ticket_id)

    @with_db_transaction
    @requires_user([Privilege.product_management])
    async def delete_ticket(self, ctx: UserContext, *, ticket_id: int) -> bool:
        result = await ctx.conn.execute(
            "delete from ticket where id = $1",
            ticket_id,
        )
        return result != "DELETE 0"
