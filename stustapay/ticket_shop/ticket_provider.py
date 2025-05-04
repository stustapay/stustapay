import enum
from abc import abstractmethod
from datetime import datetime

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node


class ExternalTicketType(enum.Enum):
    pretix = "pretix"


class CreateExternalTicket(BaseModel):
    external_reference: str
    created_at: datetime
    token: str
    ticket_type: ExternalTicketType
    external_link: str | None = None
    customer_email: str | None = None


class ExternalTicket(CreateExternalTicket):
    id: int
    customer_account_id: int
    has_checked_in: bool


async def fetch_external_tickets(conn: Connection, node: Node) -> list[ExternalTicket]:
    return await conn.fetch_many(
        ExternalTicket,
        "select "
        "   tv.*, "
        "   case when a.user_tag_id is null then false else true end as has_checked_in "
        "from ticket_voucher tv join account a on tv.customer_account_id = a.id "
        "where tv.node_id = $1",
        node.event_node_id,
    )


class TicketProvider:
    def __init__(self, config: Config, db_pool: asyncpg.Pool):
        self.config = config
        self.db_pool = db_pool

    @abstractmethod
    async def synchronize_tickets(self):
        pass

    async def store_external_ticket(self, conn: Connection, node: Node, ticket: CreateExternalTicket) -> bool:
        exists_already = await conn.fetchval(
            "select exists(select from ticket_voucher where node_id = $1 and token = $2)",
            node.event_node_id,
            ticket.token,
        )
        if not exists_already:
            customer_account_id = await conn.fetchval(
                "insert into account(node_id, type) values ($1, 'private') returning id",
                node.event_node_id,
            )
            await conn.execute(
                "insert into ticket_voucher(node_id, created_at, customer_account_id, token, ticket_type, external_link, external_reference) "
                "   values ($1, $2, $3, $4, $5, $6, $7)",
                node.event_node_id,
                ticket.created_at,
                customer_account_id,
                ticket.token,
                ticket.ticket_type.name,
                ticket.external_link,
                ticket.external_reference,
            )
            if ticket.customer_email:
                await conn.execute(
                    "insert into customer_info (customer_account_id, email) values ($1, $2) on conflict (customer_account_id) do update set email = $2",
                    customer_account_id,
                    ticket.customer_email,
                )
        return not exists_already
