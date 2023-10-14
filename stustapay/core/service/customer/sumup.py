import asyncio
import logging
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Optional

import aiohttp
import asyncpg
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.customer import (
    Customer,
    CustomerCheckout,
    SumupCheckoutStatus,
)
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.till import VIRTUAL_TILL_ID
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
from stustapay.core.service.config import ConfigService, get_currency_identifier
from stustapay.core.service.order.booking import (
    BookingIdentifier,
    NewLineItem,
    book_order,
)
from stustapay.core.service.product import fetch_top_up_product
from stustapay.core.service.tree.common import fetch_event_node_for_node, fetch_node
from stustapay.framework.database import Connection


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


class SumupCreateCheckout(BaseModel):
    checkout_reference: uuid.UUID
    amount: float
    currency: str
    merchant_code: str
    description: str


class SumupConfirmCheckout(BaseModel):
    class SumupConfirmCheckoutCard(BaseModel):
        name: str
        number: str
        expiry_month: str
        expiry_year: str
        cvv: str

    payment_type: str  # "card"
    card: SumupConfirmCheckoutCard


class SumupTransaction(BaseModel):
    id: str
    transaction_code: str
    merchant_code: str
    amount: float
    vat_amount: Optional[float] = None
    tip_amount: Optional[float] = None
    currency: str
    timestamp: datetime
    status: str
    payment_type: str
    entry_mode: str
    installments_count: int
    auth_code: Optional[str] = None
    internal_id: int


class SumupCheckout(SumupCreateCheckout):
    id: str
    status: SumupCheckoutStatus
    valid_until: Optional[datetime] = None
    date: datetime
    transaction_code: Optional[str] = None
    transaction_id: Optional[str] = None
    transactions: list[SumupTransaction] = []


class SumupAuthResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class SumupAuth(BaseModel):
    access_token: str
    valid_until: datetime


def requires_sumup_enabled(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" not in kwargs:
            raise RuntimeError(
                "requires_sumup_enabled needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )
        conn = kwargs["conn"]
        is_sumup_enabled = await self.config_service.is_sumup_topup_enabled(conn=conn)
        if not is_sumup_enabled or not self.sumup_reachable:
            raise InvalidArgument("Online Top Up is currently disabled")

        return await func(self, **kwargs)

    return wrapper


class SumupService(DBService):
    SUMUP_BASE_URL = "https://api.sumup.com"
    SUMUP_API_URL = f"{SUMUP_BASE_URL}/v0.1"
    SUMUP_CHECKOUT_URL = f"{SUMUP_API_URL}/checkouts"
    SUMUP_AUTH_URL = f"{SUMUP_BASE_URL}/token"
    SUMUP_AUTH_REFRESH_THRESHOLD = timedelta(seconds=180)
    SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
    SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)

    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("customer")

        self.sumup_reachable = True

    async def _get_sumup_auth_headers(self) -> dict:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.cfg.customer_portal.sumup_config.api_key}",
        }

    async def check_sumup_auth(self):
        sumup_enabled = await self.config_service.is_sumup_topup_enabled()
        if not sumup_enabled:
            self.logger.info("Sumup is disabled via the config")
            return

        self.logger.info("Checking if the configured sumup api key is valid")
        sumup_url = (
            f"{self.SUMUP_API_URL}/merchants/{self.cfg.customer_portal.sumup_config.merchant_code}/payment-methods"
        )
        async with aiohttp.ClientSession(trust_env=True, headers=await self._get_sumup_auth_headers()) as session:
            try:
                async with session.get(sumup_url, timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}, disabling online top up"
                        )
                        return
            except Exception:  # pylint: disable=bare-except
                self.logger.error(f"Sumup API error {traceback.print_exc()}")
                return

        self.logger.info("Successfully validated the sumup api key")
        self.sumup_reachable = True

    async def _create_sumup_checkout(self, *, checkout: SumupCreateCheckout) -> SumupCheckout:
        async with aiohttp.ClientSession(trust_env=True, headers=await self._get_sumup_auth_headers()) as session:
            try:
                payload = checkout.json()
                async with session.post(self.SUMUP_CHECKOUT_URL, data=payload, timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}"
                        )
                        raise SumUpError("Sumup API returned an error")

                    response_json = await response.json()

            except asyncio.TimeoutError as e:
                self.logger.error("Sumup API timeout")
                raise SumUpError("Sumup API timeout") from e

        return SumupCheckout.model_validate(response_json)

    async def _get_checkout(self, *, checkout_id: str) -> SumupCheckout:
        async with aiohttp.ClientSession(trust_env=True, headers=await self._get_sumup_auth_headers()) as session:
            try:
                async with session.get(f"{self.SUMUP_CHECKOUT_URL}/{checkout_id}", timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}"
                        )
                        raise SumUpError("Sumup API returned an error")

                    response_json = await response.json()

            except asyncio.TimeoutError as e:
                self.logger.error("Sumup API timeout")
                raise SumUpError("Sumup API timeout") from e

        return SumupCheckout.model_validate(response_json)

    @staticmethod
    async def _get_db_checkout(*, conn: Connection, checkout_id: str) -> CustomerCheckout:
        checkout = await conn.fetch_maybe_one(
            CustomerCheckout, "select * from customer_sumup_checkout where id = $1", checkout_id
        )
        if checkout is None:
            raise NotFound(element_typ="checkout", element_id=checkout_id)
        return checkout

    @staticmethod
    async def _process_topup(conn: Connection, checkout: SumupCheckout):
        top_up_product = await fetch_top_up_product(conn=conn)
        row = await conn.fetchval(
            "select c.customer_account_id, a.node_id "
            "from customer_sumup_checkout c join account a on c.customer_account_id = a.id "
            "where checkout_reference = $1",
            checkout.checkout_reference,
        )
        if row is None:
            raise InvalidArgument(
                f"Inconsistency detected: checkout not found. Reference: {checkout.checkout_reference}"
            )
        customer_account_id = row["customer_account_id"]
        node_id = row["node_id"]

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=top_up_product.id,
                product_price=checkout.amount,
                tax_rate=top_up_product.tax_rate,
                tax_name=top_up_product.tax_name,
            )
        ]

        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        sumup_online_entry = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.sumup_online_entry
        )

        bookings = {
            BookingIdentifier(
                source_account_id=sumup_online_entry.id, target_account_id=customer_account_id
            ): checkout.amount
        }

        await book_order(
            conn=conn,
            uuid=checkout.checkout_reference,
            order_type=OrderType.top_up,
            payment_method=PaymentMethod.sumup_online,
            cashier_id=None,
            till_id=VIRTUAL_TILL_ID,
            customer_account_id=customer_account_id,
            line_items=line_items,
            bookings=bookings,
        )

    @staticmethod
    async def _get_pending_checkouts(*, conn: Connection) -> list[CustomerCheckout]:
        return await conn.fetch_many(
            CustomerCheckout,
            "select * from customer_sumup_checkout where status = $1",
            SumupCheckoutStatus.PENDING.value,
        )

    async def run_sumup_checkout_processing(self):
        sumup_enabled = await self.config_service.is_sumup_topup_enabled()
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
                        async with conn.transaction():
                            status = await self._update_checkout_status(conn=conn, checkout_id=pending_checkout.id)
                            if status != SumupCheckoutStatus.PENDING:
                                self.logger.info(f"Sumup checkout {pending_checkout.id} updated to status {status}")
            except Exception as e:
                self.logger.error(f"process pending checkouts threw an error: {e}")

    async def _update_checkout_status(self, conn: Connection, checkout_id: str) -> SumupCheckoutStatus:
        stored_checkout = await self._get_db_checkout(conn=conn, checkout_id=checkout_id)
        sumup_checkout = await self._get_checkout(checkout_id=stored_checkout.id)

        if stored_checkout.status != SumupCheckoutStatus.PENDING:
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

        if sumup_checkout.status == SumupCheckoutStatus.PAID:
            await self._process_topup(conn=conn, checkout=sumup_checkout)
            check_interval = 0
        else:
            check_interval = min(
                self.cfg.customer_portal.sumup_config.max_check_interval,
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

    @with_db_transaction
    @requires_customer
    @requires_sumup_enabled
    async def check_checkout(
        self, *, conn: Connection, current_customer: Customer, checkout_id: str
    ) -> SumupCheckoutStatus:
        stored_checkout = await self._get_db_checkout(conn=conn, checkout_id=checkout_id)

        # check that current customer is the one referenced in this checkout
        if stored_checkout.customer_account_id != current_customer.id:
            raise AccessDenied("Found checkout does not belong to current customer")
        return await self._update_checkout_status(conn=conn, checkout_id=checkout_id)

    @with_db_transaction
    @requires_customer
    @requires_sumup_enabled
    async def create_checkout(self, *, conn: Connection, current_customer: Customer, amount: float) -> SumupCheckout:
        # TODO: tree
        event_node = await fetch_event_node_for_node(conn=conn, node_id=1)
        assert event_node is not None
        assert event_node.event is not None
        # check if pending checkout already exists
        # if await conn.fetchval(
        #     "select exists(select * from customer_sumup_checkout where customer_account_id = $1 and status = $2)",
        #     current_customer.id,
        #     SumupCheckoutStatus.PENDING.name,
        # ):
        #     raise PendingCheckoutAlreadyExists("an online topup is already in progress for this customer")

        currency_identifier = await get_currency_identifier(conn=conn)

        # check amount
        if amount <= 0:
            raise InvalidArgument("Must top up more than 0€")

        max_account_balance = event_node.event.max_account_balance
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

        create_checkout = SumupCreateCheckout(
            checkout_reference=checkout_reference,
            amount=amount,
            currency=currency_identifier,
            merchant_code=self.cfg.customer_portal.sumup_config.merchant_code,
            description=f"StuStaCulum 2023 Online TopUp {format_user_tag_uid(current_customer.user_tag_uid)} {checkout_reference}",
        )
        checkout_response = await self._create_sumup_checkout(checkout=create_checkout)

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
