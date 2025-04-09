import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
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
    fetch_order_by_uuid,
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
    SumUpError,
)

SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)
SUMUP_PENDING_ORDER_TIMEOUT = timedelta(minutes=5)  # Time after which pending orders are considered failed


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
        # Number of retry attempts for serialization errors
        max_retries = 3
        retry_count = 0
        
        while retry_count <= max_retries:
            try:
                self.logger.debug(f"Processing pending order {pending_order.uuid} (attempt {retry_count + 1})")
                
                # Check if order has already been processed
                existing_order = await conn.fetchrow(
                    "SELECT id FROM ordr WHERE uuid = $1",
                    pending_order.uuid
                )
                if existing_order is not None:
                    self.logger.info(f"Order {pending_order.uuid} has already been processed")
                    # Update the pending order status to booked to remove it from processing queue
                    await conn.execute(
                        "UPDATE pending_sumup_order SET status = 'booked' WHERE uuid = $1",
                        pending_order.uuid
                    )
                    return None
                    
                event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=pending_order.node_id)
                
                if not event.sumup_api_key or not event.sumup_merchant_code:
                    self.logger.error(f"Missing SumUp API key or merchant code for order {pending_order.uuid}")
                    return None
                    
                sumup_api = self._create_sumup_api(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
                
                # For online payments, only check the checkout API
                try:
                    sumup_checkout = await sumup_api.find_checkout(pending_order.uuid)
                    if not sumup_checkout:
                        self.logger.debug(f"Order {pending_order.uuid} not found in sumup")
                        return None
                        
                    self.logger.info(f"Found checkout for order {pending_order.uuid} with status {sumup_checkout.status}")
                    if sumup_checkout.status == SumUpCheckoutStatus.PAID:
                        # Process the successful checkout
                        node = await fetch_node(conn=conn, node_id=pending_order.node_id)
                        if node is None:
                            self.logger.error(f"Found a pending order without a matching node: {pending_order.uuid}")
                            raise InvalidArgument("Found a pending order without a matching node")
                        till = await fetch_till(conn=conn, node=node, till_id=pending_order.till_id)
                        if till is None:
                            self.logger.error(f"Found a pending order without a matching till: {pending_order.uuid}")
                            raise InvalidArgument("Found a pending order without a matching till")
                            
                        if pending_order.order_type == PendingOrderType.topup:
                            topup = load_pending_topup(pending_order)
                            result = await self._process_topup(conn=conn, node=node, till=till, pending_order=pending_order, topup=topup)
                            self.logger.info(f"Successfully processed checkout topup for order {pending_order.uuid}")
                            return result
                        elif pending_order.order_type == PendingOrderType.ticket:
                            ticket_sale = load_pending_ticket_sale(pending_order)
                            result = await self._process_ticket_sale(conn=conn, node=node, till=till, pending_order=pending_order, ticket_sale=ticket_sale)
                            self.logger.info(f"Successfully processed checkout ticket sale for order {pending_order.uuid}")
                            return result
                    elif sumup_checkout.status == SumUpCheckoutStatus.FAILED:
                        # For failed checkouts, mark as cancelled
                        await conn.execute(
                            "UPDATE pending_sumup_order SET status = 'cancelled' WHERE uuid = $1", 
                            pending_order.uuid
                        )
                except SumUpError as e:
                    self.logger.error(f"SumUp API error while finding checkout for order {pending_order.uuid}: {e}")
                    return None
                except Exception as e:
                    self.logger.exception(f"Unexpected error finding checkout for order {pending_order.uuid}: {e}")
                    return None

                return None
                
            except asyncpg.exceptions.SerializationError as e:
                retry_count += 1
                if retry_count <= max_retries:
                    # Exponential backoff: wait 0.1s, 0.2s, 0.4s...
                    wait_time = 0.1 * (2 ** (retry_count - 1))
                    self.logger.warning(f"Serialization error processing order {pending_order.uuid}, retrying in {wait_time}s (attempt {retry_count}/{max_retries}): {e}")
                    await asyncio.sleep(wait_time)
                else:
                    self.logger.error(f"Failed to process order {pending_order.uuid} after {max_retries} retries due to serialization errors")
                    return None
            except Exception as e:
                self.logger.exception(f"Error processing pending order {pending_order.uuid}: {e}")
                return None
                
        return None

    @with_db_transaction
    @requires_customer
    @requires_sumup_online_topup_enabled
    async def check_online_topup_checkout(
        self, *, conn: Connection, current_customer: Customer, order_uuid: uuid.UUID
    ) -> SumUpCheckoutStatus:
        try:
            # Use fetch_order_by_uuid to get the order regardless of status
            pending_order = await fetch_order_by_uuid(conn=conn, uuid=order_uuid)
            if not pending_order:
                return SumUpCheckoutStatus.FAILED
                
            if pending_order.order_type != PendingOrderType.topup:
                raise InvalidArgument("Invalid order uuid")
            topup = load_pending_topup(pending_order)
            if topup.customer_account_id != current_customer.id:
                raise InvalidArgument("Invalid order uuid")
            if pending_order.status == PendingOrderStatus.booked:
                return SumUpCheckoutStatus.PAID
            if pending_order.status == PendingOrderStatus.cancelled:
                return SumUpCheckoutStatus.FAILED

            # Only process if the order is still pending
            if pending_order.status == PendingOrderStatus.pending:
                # Check if the order has been pending for too long
                current_time = datetime.now(timezone.utc)
                order_creation_time = pending_order.created_at
                if order_creation_time is not None and (current_time - order_creation_time) > SUMUP_PENDING_ORDER_TIMEOUT:
                    self.logger.warning(f"Order {order_uuid} has been pending for more than {SUMUP_PENDING_ORDER_TIMEOUT}, marking as cancelled")
                    # Update the order status to cancelled in the database
                    await conn.execute(
                        "UPDATE pending_sumup_order SET status = $1 WHERE uuid = $2",
                        PendingOrderStatus.cancelled.value,
                        order_uuid,
                    )
                    return SumUpCheckoutStatus.FAILED
                
                event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=pending_order.node_id)
                if not event.sumup_api_key or not event.sumup_merchant_code:
                    self.logger.error(f"Missing SumUp API key or merchant code for order {pending_order.uuid}")
                    return SumUpCheckoutStatus.FAILED
                    
                sumup_api = self._create_sumup_api(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
                
                # Only check the checkout status, don't process the payment
                try:
                    # Find the checkout
                    sumup_checkout = await sumup_api.find_checkout(order_uuid)
                    if sumup_checkout:
                        self.logger.info(f"Found checkout for order {order_uuid} with status {sumup_checkout.status}")
                        # Just return the checkout status - let the payment processor handle the actual processing
                        if sumup_checkout.status == SumUpCheckoutStatus.PAID:
                            # Mark the order as seen as PAID but don't process it here
                            # The background payment processor will handle the actual processing
                            self.logger.info(f"Customer portal detected PAID status for order {order_uuid}, letting payment processor handle it")
                            return SumUpCheckoutStatus.PAID
                        return sumup_checkout.status
                    else:
                        self.logger.debug(f"Checkout not found for order {order_uuid}")
                except SumUpError as e:
                    self.logger.error(f"SumUp API error while finding checkout for order {order_uuid}: {e}")
                    return SumUpCheckoutStatus.FAILED
                except Exception as e:
                    self.logger.exception(f"Unexpected error finding checkout for order {order_uuid}: {e}")
                    return SumUpCheckoutStatus.FAILED
            
            return SumUpCheckoutStatus.FAILED
        except asyncpg.exceptions.PostgresError:
            self.logger.exception(f"Error checking sumup checkout for order_uuid={order_uuid}")
            return SumUpCheckoutStatus.FAILED
        except Exception as e:
            self.logger.exception(f"Unexpected error checking sumup checkout: {e}")
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

        self.logger.info("Starting periodic job to check pending sumup transactions")
        
        while True:
            try:
                async with self.db_pool.acquire() as conn:
                    pending_orders = await fetch_pending_orders(conn=conn)
                    self.logger.info(f"Found {len(pending_orders)} pending SumUp orders to process")

                    for pending_order in pending_orders:
                        self.logger.info(f"Checking pending order uuid = {pending_order.uuid}")
                        try:
                            # Check if the order has been pending for too long
                            current_time = datetime.now(timezone.utc)
                            order_creation_time = pending_order.created_at
                            if order_creation_time is not None and (current_time - order_creation_time) > SUMUP_PENDING_ORDER_TIMEOUT:
                                self.logger.warning(f"Order {pending_order.uuid} has been pending for more than {SUMUP_PENDING_ORDER_TIMEOUT}, marking as cancelled")
                                # Update the order status to cancelled in the database
                                await conn.execute(
                                    "UPDATE pending_sumup_order SET status = $1 WHERE uuid = $2",
                                    PendingOrderStatus.cancelled.value,
                                    pending_order.uuid,
                                )
                                continue

                            self.logger.info(f"Processing pending order {pending_order.uuid}")
                            async with conn.transaction(isolation="serializable"):
                                await self.process_pending_order(conn=conn, pending_order=pending_order)
                        except Exception as order_err:
                            self.logger.exception(f"Error processing individual order {pending_order.uuid}: {order_err}")
                            # Continue with other orders
            except asyncpg.exceptions.PostgresError as db_err:
                self.logger.exception(f"Database error in payment processor: {db_err}")
            except Exception as e:
                self.logger.exception(f"Process pending orders threw an error: {e}")
                # Sleep a bit longer after an error to avoid hammering the system
                await asyncio.sleep(10)
                
            # Sleep before checking again
            await asyncio.sleep(SUMUP_CHECKOUT_POLL_INTERVAL.seconds)
