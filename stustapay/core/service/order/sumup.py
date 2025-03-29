import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from functools import wraps

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.order import (
    CompletedTicketSale,
    CompletedTopUp,
    PaymentMethod,
    PendingOrder,
    PendingOrderStatus,
    PendingOrderType,
)
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_customer
from stustapay.core.service.order.pending_order import (
    fetch_pending_order,
    fetch_pending_orders,
    load_pending_ticket_sale,
    load_pending_topup,
    make_ticket_sale_bookings,
    make_topup_bookings,
    save_pending_topup,
)
from stustapay.core.service.till.common import fetch_till, fetch_virtual_till
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.payment.sumup.api import (
    SumUpApi,
    SumUpCheckout,
    SumUpCheckoutStatus,
    SumUpCreateCheckout,
)

SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)


class CreateCheckout(BaseModel):
    amount: float


def requires_sumup_online_topup_enabled(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" not in kwargs:
            raise RuntimeError(
                "requires_sumup_enabled needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )
        conn = kwargs["conn"]
        event = await fetch_restricted_event_settings_for_node(conn, node_id=kwargs["current_customer"].node_id)
        is_sumup_enabled = event.is_sumup_topup_enabled(self.config.core)
        if not is_sumup_enabled:
            raise InvalidArgument("Online Top Up is currently disabled")

        return await func(self, **kwargs)

    return wrapper


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

    async def pending_order_exists_at_sumup(self, conn: Connection, pending_order: PendingOrder) -> bool:
        event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=pending_order.node_id)
        sumup_api = self._create_sumup_api(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
        sumup_checkout = await sumup_api.find_checkout(pending_order.uuid)
        return sumup_checkout is not None

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
            self.logger.debug(f"Found a FAILED sumup order with uuid = {pending_order.uuid}")
            await conn.execute(
                "update pending_sumup_order set status = 'cancelled' where uuid = $1", pending_order.uuid
            )
            return None
        elif sumup_checkout.status == SumUpCheckoutStatus.PAID:
            self.logger.debug(f"Found a PAID sumup order with uuid = {pending_order.uuid}, starting order booking")
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

    @with_db_transaction
    @requires_customer
    @requires_sumup_online_topup_enabled
    async def check_online_topup_checkout(
        self, *, conn: Connection, current_customer: Customer, order_uuid: uuid.UUID
    ) -> SumUpCheckoutStatus:
        pending_order = await fetch_pending_order(conn=conn, uuid=order_uuid)
        if pending_order.order_type != PendingOrderType.topup:
            raise InvalidArgument("Invalid order uuid")
        topup = load_pending_topup(pending_order)
        if topup.customer_account_id != current_customer.id:
            raise InvalidArgument("Invalid order uuid")
        if pending_order.status == PendingOrderStatus.booked:
            return SumUpCheckoutStatus.PAID
        if pending_order.status == PendingOrderStatus.cancelled:
            return SumUpCheckoutStatus.FAILED

        processed_topup = await self.process_pending_order(conn=conn, pending_order=pending_order)
        if processed_topup is None:
            return SumUpCheckoutStatus.FAILED
        if isinstance(processed_topup, CompletedTopUp):
            return SumUpCheckoutStatus.PAID

        self.logger.warning(
            f"Weird order state for uuid = {order_uuid}. Sumup order was accepted but we have the wrong order type"
        )
        return SumUpCheckoutStatus.FAILED

    @with_db_transaction
    @requires_customer
    @requires_sumup_online_topup_enabled
    async def create_online_topup_checkout(
        self, *, conn: Connection, current_customer: Customer, amount: float
    ) -> tuple[SumUpCheckout, uuid.UUID]:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_customer.node_id)
        assert event_node is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=current_customer.node_id)

        # check amount
        if amount <= 0:
            raise InvalidArgument("Must top up more than 0€")

        max_account_balance = event_settings.max_account_balance
        old_balance = current_customer.balance
        new_balance = current_customer.balance + amount
        if amount != int(amount):
            raise InvalidArgument("Cent amounts are not allowed")
        if new_balance > max_account_balance:
            raise InvalidArgument(f"Resulting balance would be more than {max_account_balance}€")

        order_uuid = uuid.uuid4()

        create_checkout = SumUpCreateCheckout(
            checkout_reference=order_uuid,
            amount=amount,
            currency=event_settings.currency_identifier,
            merchant_code=event_settings.sumup_merchant_code,
            description=f"{event_node.name} Online TopUp {current_customer.user_tag_uid_hex} {order_uuid}",
        )
        api = SumUpApi(merchant_code=event_settings.sumup_merchant_code, api_key=event_settings.sumup_api_key)
        checkout_response = await api.create_sumup_checkout(create_checkout)
        virtual_till = await fetch_virtual_till(conn=conn, node=event_node)
        completed_top_up = CompletedTopUp(
            amount=amount,
            customer_tag_uid=current_customer.user_tag_uid,
            customer_account_id=current_customer.id,
            payment_method=PaymentMethod.sumup_online,
            old_balance=old_balance,
            new_balance=new_balance,
            uuid=order_uuid,
            booked_at=datetime.now(),
            cashier_id=None,
            till_id=virtual_till.id,
        )

        await save_pending_topup(
            conn=conn, node_id=event_node.id, till_id=virtual_till.id, cashier_id=None, topup=completed_top_up
        )

        return checkout_response, order_uuid

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
                        self.logger.debug(f"checking pending order uuid = {pending_order.uuid}")
                        async with conn.transaction(isolation="serializable"):
                            await self.process_pending_order(conn=conn, pending_order=pending_order)
            except Exception as e:
                self.logger.error(f"process pending orders threw an error: {e}")
