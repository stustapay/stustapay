from datetime import datetime

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.sumup_link import create_sumup_api_for_node
from stustapay.payment.sumup.api import SumUpCheckout, SumUpError, SumUpTransaction


class SumUpService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_checkouts(self, *, conn: Connection, node: Node) -> list[SumUpCheckout]:
        resolved = await create_sumup_api_for_node(conn=conn, node_id=node.id)
        if resolved is None:
            return []
        api, _ = resolved
        try:
            return await api.list_checkouts()
        except SumUpError as exc:
            raise InvalidArgument(str(exc)) from exc

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_transactions(
        self,
        *,
        conn: Connection,
        node: Node,
        limit: int = 200,
        transaction_code: str | None = None,
        newest_time: datetime | None = None,
    ) -> list[SumUpTransaction]:
        resolved = await create_sumup_api_for_node(conn=conn, node_id=node.id)
        if resolved is None:
            return []
        api, _ = resolved
        try:
            return await api.list_transactions(
                limit=limit,
                transaction_code=transaction_code,
                newest_time=newest_time,
            )
        except SumUpError as exc:
            raise InvalidArgument(str(exc)) from exc

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_checkout(self, *, conn: Connection, node: Node, checkout_id: str) -> SumUpCheckout:
        resolved = await create_sumup_api_for_node(conn=conn, node_id=node.id)
        if resolved is None:
            raise InvalidArgument("No SumUp connection configured for this event")
        api, _ = resolved
        try:
            return await api.get_checkout(checkout_id)
        except SumUpError as exc:
            raise InvalidArgument(str(exc)) from exc
