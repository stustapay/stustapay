from abc import abstractmethod
from datetime import datetime

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node


class ExternalTicket(BaseModel):
    created_at: datetime
    ticket_code: str


class TicketProvider:
    def __init__(self, config: Config, db_pool: asyncpg.Pool):
        self.config = config
        self.db_pool = db_pool

    @abstractmethod
    async def synchronize_tickets(self):
        pass

    async def store_external_ticket(self, conn: Connection, node: Node, ticket: ExternalTicket):
        exists_already = await conn.fetchval(
            "select exists(select from ticket_voucher where node_id = $1 and token = $2)",
            node.event_node_id,
            ticket.ticket_code,
        )
        if not exists_already:
            customer_account_id = await conn.fetchval(
                "insert into account(node_id, type) values ($1, 'private') returning id",
                node.event_node_id,
            )
            await conn.execute(
                "insert into ticket_voucher(node_id, created_at, customer_account_id, token) values ($1, $2, $3, $4)",
                node.event_node_id,
                ticket.created_at,
                customer_account_id,
                ticket.ticket_code,
            )
