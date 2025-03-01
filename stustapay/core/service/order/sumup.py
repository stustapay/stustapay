import asyncio
import logging
from datetime import datetime, timedelta, timezone

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service

from stustapay.core.config import Config
from stustapay.core.schema.order import (
    CompletedTicketSale,
    CompletedTopUp,
    PendingOrder,
    PendingOrderType,
)
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node
from stustapay.core.service.auth import AuthService
from stustapay.core.service.order.pending_order import (
    fetch_pending_orders,
    load_pending_ticket_sale,
    load_pending_topup,
    make_ticket_sale_bookings,
    make_topup_bookings,
)
from stustapay.core.service.till.common import fetch_till
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.payment.sumup.api import SumUpApi, SumUpCheckoutStatus

SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)


def _should_check_order(order: PendingOrder) -> bool:
    if order.last_checked is None:
        return True
    if datetime.now(tz=timezone.utc) > order.created_at + SUMUP_INITIAL_CHECK_TIMEOUT:
        return True
    if datetime.now(tz=timezone.utc) > order.last_checked + timedelta(seconds=order.check_interval):
        return True
    return False


class SumupService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.logger = logging.getLogger("sumup")

    def _create_sumup_api(self, merchant_code: str, api_key: str) -> SumUpApi:
        return SumUpApi(merchant_code=merchant_code, api_key=api_key)

    async def _process_topup(
        self, conn: Connection, node: Node, till: Till, pending_order: PendingOrder, topup: CompletedTopUp
    ):
        await make_topup_bookings(
            conn=conn,
            current_till=till,
            node=node,
            current_user_id=pending_order.cashier_id,
            top_up=topup,
            booked_at=pending_order.created_at,
        )
        await conn.execute("update pending_sumup_order set status = 'booked' where uuid = $1", pending_order.uuid)

    async def _process_ticket_sale(
        self, conn: Connection, node: Node, till: Till, pending_order: PendingOrder, ticket_sale: CompletedTicketSale
    ):
        await make_ticket_sale_bookings(
            conn=conn,
            current_till=till,
            node=node,
            current_user_id=pending_order.cashier_id,
            ticket_sale=ticket_sale,
            booked_at=pending_order.created_at,
        )
        await conn.execute("update pending_sumup_order set status = 'booked' where uuid = $1", pending_order.uuid)

    async def process_pending_order(
        self, conn: Connection, pending_order: PendingOrder
    ) -> CompletedTicketSale | CompletedTopUp | None:
        event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=pending_order.node_id)
        sumup_api = self._create_sumup_api(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
        sumup_checkout = await sumup_api.find_checkout(pending_order.uuid)
        if not sumup_checkout:
            self.logger.debug(f"Order {pending_order.uuid} not found in sumup")
            return None

        if sumup_checkout.status == SumUpCheckoutStatus.FAILED:
            await conn.execute(
                "update pending_sumup_order set status = 'cancelled' where uuid = $1", pending_order.uuid
            )
            return None
        elif sumup_checkout.status == SumUpCheckoutStatus.PAID:
            node = await fetch_node(conn=conn, node_id=pending_order.node_id)
            if node is None:
                raise InvalidArgument("Found a pending order without a matching node")
            till = await fetch_till(conn=conn, node=node, till_id=pending_order.till_id)
            if till is None:
                raise InvalidArgument("Found a pending order without a matching till")
            match pending_order.order_type:
                case PendingOrderType.topup:
                    topup = load_pending_topup(pending_order)
                    await self._process_topup(conn=conn, pending_order=pending_order, topup=topup, node=node, till=till)
                    return topup
                case PendingOrderType.ticket:
                    ticket_sale = load_pending_ticket_sale(pending_order)
                    await self._process_ticket_sale(
                        conn=conn, pending_order=pending_order, ticket_sale=ticket_sale, node=node, till=till
                    )
                    return ticket_sale
                case _:
                    return None

        check_interval = min(
            self.config.core.sumup_max_check_interval,
            int(round(2.5 * pending_order.check_interval)),
        )
        await conn.execute(
            "update pending_sumup_order set check_interval = $1, last_checked = now() where uuid = $2",
            check_interval,
            pending_order.uuid,
        )

        return None

    async def run_sumup_pending_order_processing(self):
        sumup_enabled = self.config.core.sumup_enabled
        if not sumup_enabled:
            self.logger.info("Sumup payments are disabled for this SSP instance, disabling pending order processing")
            return

        self.logger.info("Staring periodic job to check pending sumup transactions")
        while True:
            await asyncio.sleep(SUMUP_CHECKOUT_POLL_INTERVAL.seconds)
            try:
                async with self.db_pool.acquire() as conn:
                    pending_orders = await fetch_pending_orders(conn=conn)

                    for pending_order in pending_orders:
                        if _should_check_order(pending_order):
                            self.logger.debug(f"skipping pending checkout {pending_order.uuid} due to backoff")
                            continue

                        self.logger.debug(f"checking pending order uuid = {pending_order.uuid}")
                        async with conn.transaction(isolation="serializable"):
                            await self.process_pending_order(conn=conn, pending_order=pending_order)
            except Exception as e:
                self.logger.error(f"process pending orders threw an error: {e}")
