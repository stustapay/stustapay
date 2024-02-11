import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node
from stustapay.framework.database import Connection
from stustapay.payment.sumup.api import SumUpApi, SumUpCheckout, SumUpTransaction


class SumUpService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_checkouts(self, *, conn: Connection, node: Node) -> list[SumUpCheckout]:
        settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        api = SumUpApi(api_key=settings.sumup_api_key, merchant_code=settings.sumup_merchant_code)
        return await api.list_checkouts()

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_transactions(self, *, conn: Connection, node: Node) -> list[SumUpTransaction]:
        settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        api = SumUpApi(api_key=settings.sumup_api_key, merchant_code=settings.sumup_merchant_code)
        return await api.list_transactions()

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_checkout(self, *, conn: Connection, node: Node, checkout_id: str) -> SumUpCheckout:
        settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        api = SumUpApi(api_key=settings.sumup_api_key, merchant_code=settings.sumup_merchant_code)
        return await api.get_checkout(checkout_id)
