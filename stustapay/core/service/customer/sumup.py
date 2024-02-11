import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

import aiohttp
import asyncpg
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.customer import Customer, CustomerCheckout
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.tree import RestrictedEventSettings
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)
from stustapay.core.service.common.error import (
    AccessDenied,
    InvalidArgument,
    NotFound,
    ServiceException,
)
from stustapay.core.service.order.booking import (
    BookingIdentifier,
    NewLineItem,
    book_order,
)
from stustapay.core.service.product import fetch_top_up_product
from stustapay.core.service.till.common import fetch_virtual_till
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.framework.database import Connection
from stustapay.payment.sumup.api import (
    SumUpApi,
    SumUpCheckout,
    SumUpCheckoutStatus,
    SumUpCreateCheckout,
)


class SumUpError(ServiceException):
    id = "SumUpError"

    def __init__(self, msg: str):
        self.msg = msg


class PendingCheckoutAlreadyExists(ServiceException):
    id = "PendingCheckoutAlreadyExists"

    def __init__(self, msg: str):
        self.msg = msg


class CreateCheckout(BaseModel):
    amount: float


def requires_sumup_enabled(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" not in kwargs:
            raise RuntimeError(
                "requires_sumup_enabled needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )
        conn = kwargs["conn"]
        event = await fetch_restricted_event_settings_for_node(conn, node_id=kwargs["current_customer"].node_id)
        is_sumup_enabled = event.is_sumup_topup_enabled(self.cfg.core)
        if not is_sumup_enabled or not self.sumup_reachable:
            raise InvalidArgument("Online Top Up is currently disabled")

        return await func(self, **kwargs)

    return wrapper


def _get_sumup_auth_headers(event: RestrictedEventSettings) -> dict:
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {event.sumup_api_key}",
    }


class SumupService(DBService):
    SUMUP_API_URL = "https://api.sumup.com/v0.1"
    SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
    SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)

    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.logger = logging.getLogger("customer")

        self.sumup_reachable = True

    async def check_sumup_auth(self, event: RestrictedEventSettings):
        sumup_enabled = event.is_sumup_topup_enabled(self.cfg.core)
        if not sumup_enabled:
            self.logger.info("Sumup is disabled via the config")
            return

        self.logger.info("Checking if the configured sumup api key is valid")
        sumup_url = f"{self.SUMUP_API_URL}/merchants/{event.sumup_merchant_code}/payment-methods"
        async with aiohttp.ClientSession(trust_env=True, headers=_get_sumup_auth_headers(event)) as session:
            try:
                async with session.get(sumup_url, timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}, disabling online top up"
                        )
                        return
            except Exception:  # pylint: disable=bare-except
                self.logger.exception("Sumup API error")
                return

        self.logger.info("Successfully validated the sumup api key")
        self.sumup_reachable = True

    async def _create_sumup_checkout(
        self, *, event: RestrictedEventSettings, checkout: SumUpCreateCheckout
    ) -> SumUpCheckout:
        api = SumUpApi(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
        return await api.create_sumup_checkout(checkout)

    async def _get_checkout(self, *, event: RestrictedEventSettings, checkout_id: str) -> SumUpCheckout:
        api = SumUpApi(merchant_code=event.sumup_merchant_code, api_key=event.sumup_api_key)
        return await api.get_checkout(checkout_id)

    @staticmethod
    async def _get_db_checkout(*, conn: Connection, checkout_id: str) -> CustomerCheckout:
        checkout = await conn.fetch_maybe_one(
            CustomerCheckout, "select * from customer_sumup_checkout where id = $1", checkout_id
        )
        if checkout is None:
            raise NotFound(element_typ="checkout", element_id=checkout_id)
        return checkout

    @staticmethod
    async def _process_topup(conn: Connection, checkout: SumUpCheckout):
        row = await conn.fetchrow(
            "select c.customer_account_id, a.node_id "
            "from customer_sumup_checkout c join account a on c.customer_account_id = a.id "
            "where checkout_reference = $1",
            checkout.checkout_reference,
        )
        if row is None:
            raise InvalidArgument(
                f"Inconsistency detected: checkout not found. Reference: {checkout.checkout_reference}"
            )
        node_id = row["node_id"]
        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        top_up_product = await fetch_top_up_product(conn=conn, node=node)
        customer_account_id = row["customer_account_id"]

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=top_up_product.id,
                product_price=checkout.amount,
                tax_rate_id=top_up_product.tax_rate_id,
            )
        ]

        sumup_online_entry = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.sumup_online_entry
        )

        bookings = {
            BookingIdentifier(
                source_account_id=sumup_online_entry.id, target_account_id=customer_account_id
            ): checkout.amount
        }

        virtual_till = await fetch_virtual_till(conn=conn, node=node)
        await book_order(
            conn=conn,
            uuid=checkout.checkout_reference,
            order_type=OrderType.top_up,
            payment_method=PaymentMethod.sumup_online,
            cashier_id=None,
            till_id=virtual_till.id,
            customer_account_id=customer_account_id,
            line_items=line_items,
            bookings=bookings,
        )

    @staticmethod
    async def _get_pending_checkouts(*, conn: Connection) -> list[CustomerCheckout]:
        return await conn.fetch_many(
            CustomerCheckout,
            "select * from customer_sumup_checkout where status = $1",
            SumUpCheckoutStatus.PENDING.value,
        )

    async def run_sumup_checkout_processing(self):
        sumup_enabled = self.cfg.core.sumup_enabled
        if not sumup_enabled or not self.sumup_reachable:
            self.logger.info("Sumup online topup not enabled, disabling sumup check state")
            return

        self.logger.info("Staring periodic job to check pending sumup transactions")
        while True:
            await asyncio.sleep(self.SUMUP_CHECKOUT_POLL_INTERVAL.seconds)
            try:
                # get all pending checkouts
                async with self.db_pool.acquire() as conn:
                    pending_checkouts = await self._get_pending_checkouts(conn=conn)

                    # for each pending checkout, check the status with sumup
                    for pending_checkout in pending_checkouts:
                        if datetime.now(tz=timezone.utc) < pending_checkout.date + self.SUMUP_INITIAL_CHECK_TIMEOUT or (
                            pending_checkout.last_checked is not None
                            and datetime.now(tz=timezone.utc)
                            < pending_checkout.last_checked + timedelta(seconds=pending_checkout.check_interval)
                        ):
                            self.logger.debug(
                                f"skipping pending checkout {pending_checkout.checkout_reference} due to backoff"
                            )
                            continue

                        self.logger.debug(f"checking pending checkout {pending_checkout.checkout_reference}")
                        async with conn.transaction(isolation="serializable"):
                            status = await self._update_checkout_status(conn=conn, checkout_id=pending_checkout.id)
                            if status != SumUpCheckoutStatus.PENDING:
                                self.logger.info(f"Sumup checkout {pending_checkout.id} updated to status {status}")
            except Exception as e:
                self.logger.error(f"process pending checkouts threw an error: {e}")

    async def _update_checkout_status(self, conn: Connection, checkout_id: str) -> SumUpCheckoutStatus:
        stored_checkout = await self._get_db_checkout(conn=conn, checkout_id=checkout_id)
        customer_account_node_id = await conn.fetchval(
            "select node_id from account where id = $1", stored_checkout.customer_account_id
        )
        assert customer_account_node_id is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=customer_account_node_id)
        sumup_checkout = await self._get_checkout(event=event_settings, checkout_id=stored_checkout.id)

        if stored_checkout.status != SumUpCheckoutStatus.PENDING:
            return stored_checkout.status

        # validate that the stored checkout matches up with the checkout info given by sumup
        if (
            sumup_checkout.checkout_reference != stored_checkout.checkout_reference
            or sumup_checkout.amount != stored_checkout.amount
            or sumup_checkout.currency != stored_checkout.currency
            or sumup_checkout.merchant_code != stored_checkout.merchant_code
            or sumup_checkout.description != stored_checkout.description
            or sumup_checkout.id != stored_checkout.id
            or sumup_checkout.date != stored_checkout.date
        ):
            raise SumUpError("Inconsistency! Sumup checkout info does not match stored checkout info!!!")

        if sumup_checkout.status == SumUpCheckoutStatus.PAID:
            await self._process_topup(conn=conn, checkout=sumup_checkout)
            check_interval = 0
        else:
            check_interval = min(
                self.cfg.core.sumup_max_check_interval,
                int(round(2.5 * stored_checkout.check_interval)),
            )

        # update both valid_until and status in db
        await conn.fetchrow(
            "update customer_sumup_checkout set status = $1, valid_until = $2, last_checked = now(), "
            "   check_interval = $4 "
            "where id = $3",
            sumup_checkout.status.name,
            sumup_checkout.valid_until,
            stored_checkout.id,
            check_interval,
        )

        return sumup_checkout.status

    @with_db_transaction(read_only=True)
    @requires_customer
    @requires_sumup_enabled
    async def check_checkout(
        self, *, conn: Connection, current_customer: Customer, checkout_id: str
    ) -> SumUpCheckoutStatus:
        stored_checkout = await self._get_db_checkout(conn=conn, checkout_id=checkout_id)

        # check that current customer is the one referenced in this checkout
        if stored_checkout.customer_account_id != current_customer.id:
            raise AccessDenied("Found checkout does not belong to current customer")
        return await self._update_checkout_status(conn=conn, checkout_id=checkout_id)

    @with_db_transaction
    @requires_customer
    @requires_sumup_enabled
    async def create_checkout(self, *, conn: Connection, current_customer: Customer, amount: float) -> SumUpCheckout:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_customer.node_id)
        assert event_node is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=current_customer.node_id)

        # check amount
        if amount <= 0:
            raise InvalidArgument("Must top up more than 0€")

        max_account_balance = event_settings.max_account_balance
        if amount != int(amount):
            raise InvalidArgument("Cent amounts are not allowed")
        if amount > max_account_balance - current_customer.balance:
            raise InvalidArgument(f"Resulting balance would be more than {max_account_balance}€")

        # create checkout reference as uuid
        checkout_reference = uuid.uuid4()
        # check if checkout reference already exists
        while await conn.fetchval(
            "select exists(select * from customer_sumup_checkout where checkout_reference = $1)", checkout_reference
        ):
            checkout_reference = uuid.uuid4()

        create_checkout = SumUpCreateCheckout(
            checkout_reference=checkout_reference,
            amount=amount,
            currency=event_settings.currency_identifier,
            merchant_code=event_settings.sumup_merchant_code,
            # TODO: HARDCODED
            description=f"{event_node.name} Online TopUp {format_user_tag_uid(current_customer.user_tag_uid)} {checkout_reference}",
        )
        checkout_response = await self._create_sumup_checkout(event=event_settings, checkout=create_checkout)

        await conn.execute(
            "insert into customer_sumup_checkout ("
            "   checkout_reference, amount, currency, merchant_code, description, id, status, date, "
            "   valid_until, customer_account_id"
            ") "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            checkout_response.checkout_reference,
            checkout_response.amount,
            checkout_response.currency,
            checkout_response.merchant_code,
            checkout_response.description,
            checkout_response.id,
            checkout_response.status.name,
            checkout_response.date,
            None,
            current_customer.id,
        )

        return checkout_response
