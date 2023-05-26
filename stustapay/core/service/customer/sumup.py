import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

import aiohttp
import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import ACCOUNT_SUMUP_CUSTOMER_TOPUP
from stustapay.core.schema.customer import Customer, CustomerCheckout, SumupCheckoutStatus
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_customer
from stustapay.core.service.common.error import ServiceException, InvalidArgument, NotFound
from stustapay.core.service.config import ConfigService, get_currency_identifier
from stustapay.core.service.order.booking import NewLineItem, BookingIdentifier, book_order
from stustapay.core.service.product import fetch_top_up_product
from stustapay.core.util import BaseModel


class SumUpError(ServiceException):
    id = "SumUpError"

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
    return_url: str
    customer_id: str
    # redirect_url: Optional[str] = None


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
    vat_amount: float
    tip_amount: float
    currency: str
    timestamp: datetime
    status: str
    payment_type: str
    entry_mode: str
    installments_count: int
    auth_code: str
    internal_id: int


class SumupCheckout(SumupCreateCheckout):
    id: str
    pay_to_email: str
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


class SumupService(DBService):
    SUMUP_API_URL = "https://api.sumup.com/v0.1"
    SUMUP_CHECKOUT_URL = f"{SUMUP_API_URL}/checkouts"
    SUMUP_AUTH_URL = "https://api.sumup.com/token"
    SUMUP_AUTH_REFRESH_THRESHOLD = timedelta(seconds=180)

    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("customer")

        self.sumup_auth: Optional[SumupAuth] = None

    async def _get_sumup_auth_headers(self) -> dict:
        if self.sumup_auth is None or self.sumup_auth.valid_until < datetime.now() + self.SUMUP_AUTH_REFRESH_THRESHOLD:
            await self._auth_with_sumup()

        if self.sumup_auth is None:
            raise SumUpError("Could not authenticate with sumup")

        return {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.sumup_auth.access_token}",
        }

    async def _auth_with_sumup(self):
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "grant_type": "client_credentials",
            "client_id": self.cfg.customer_portal.sumup_config.client_id,
            "client_secret": self.cfg.customer_portal.sumup_config.client_secret,
        }
        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                async with session.post(self.SUMUP_AUTH_URL, data=data, timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}"
                        )
                        raise SumUpError("Sumup API returned an error")

                    response_json = await response.json()

            except asyncio.TimeoutError as e:
                self.logger.error("Sumup API timeout")
                raise SumUpError("Sumup API timeout") from e

            resp = SumupAuthResponse.parse_obj(response_json)
            self.sumup_auth = SumupAuth(
                access_token=resp.access_token, valid_until=datetime.now() + timedelta(seconds=resp.expires_in)
            )

    async def login_to_sumup(self):
        sumup_enabled = await self.config_service.is_sumup_topup_enabled()
        if sumup_enabled:
            await self._auth_with_sumup()

    async def _create_sumup_checkout(self, *, checkout: SumupCreateCheckout) -> SumupCheckout:
        async with aiohttp.ClientSession(headers=await self._get_sumup_auth_headers()) as session:
            try:
                async with session.post(self.SUMUP_CHECKOUT_URL, data=checkout.json(), timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}"
                        )
                        raise SumUpError("Sumup API returned an error")

                    response_json = await response.json()

            except asyncio.TimeoutError as e:
                self.logger.error("Sumup API timeout")
                raise SumUpError("Sumup API timeout") from e

        return SumupCheckout.parse_obj(response_json)

    async def _get_checkout(self, *, checkout_id: str) -> SumupCheckout:
        async with aiohttp.ClientSession(headers=await self._get_sumup_auth_headers()) as session:
            try:
                async with session.get(f"{self.SUMUP_API_URL}/checkouts/{checkout_id}", timeout=2) as response:
                    if not response.ok:
                        self.logger.error(
                            f"Sumup API returned status code {response.status} with body {await response.text()}"
                        )
                        raise SumUpError("Sumup API returned an error")

                    response_json = await response.json()

            except asyncio.TimeoutError as e:
                self.logger.error("Sumup API timeout")
                raise SumUpError("Sumup API timeout") from e

        return SumupCheckout.parse_obj(response_json)

    # TODO: create async thread which regularly checks the pending actions over the sumup api
    # https://developer.sumup.com/docs/api/retrieve-a-checkout/

    @staticmethod
    async def _get_db_checkout(*, conn: asyncpg.Connection, checkout_id: str) -> CustomerCheckout:
        row = await conn.fetchrow("select * from customer_sumup_checkout where id = $1", checkout_id)
        if row is None:
            raise NotFound(element_typ="checkout", element_id=checkout_id)
        return CustomerCheckout.parse_obj(row)

    async def _process_topup(self, conn: asyncpg.Connection, checkout: SumupCheckout):
        # TODO: this topup processing is very incomplete
        customer_account_id = int(checkout.customer_id)
        top_up_product = await fetch_top_up_product(conn=conn)

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=top_up_product.id,
                product_price=checkout.amount,
                tax_rate=top_up_product.tax_rate,
                tax_name=top_up_product.tax_name,
            )
        ]

        bookings = {
            BookingIdentifier(
                source_account_id=ACCOUNT_SUMUP_CUSTOMER_TOPUP, target_account_id=customer_account_id
            ): checkout.amount
        }

        await book_order(
            conn=conn,
            uuid=checkout.checkout_reference,
            order_type=OrderType.top_up,
            payment_method=PaymentMethod.sumup_online,
            cashier_id=None,
            till_id=None,
            customer_account_id=customer_account_id,
            line_items=line_items,
            bookings=bookings,
        )

    @with_db_transaction
    @requires_customer
    async def check_checkout(self, *, conn: asyncpg.Connection, checkout_id: str) -> SumupCheckoutStatus:
        # TODO: check that current customer is the one referenced in this checkout
        checkout = await self._get_checkout(checkout_id=checkout_id)
        stored_checkout = await self._get_db_checkout(conn=conn, checkout_id=checkout_id)
        if stored_checkout.status != SumupCheckoutStatus.PENDING:
            return stored_checkout.status

        # TODO: validate that the stored checkout matches up with the checkout info given by sumup

        if checkout.status == SumupCheckoutStatus.PAID:
            await self._process_topup(conn=conn, checkout=checkout)

        # TODO: store updated checkout info in db

        return checkout.status

    @with_db_transaction
    @requires_customer
    async def create_checkout(
        self, *, conn: asyncpg.Connection, current_customer: Customer, amount: float
    ) -> SumupCheckout:
        currency_identifier = await get_currency_identifier(conn=conn)
        # check amount
        if amount <= 0:
            raise InvalidArgument("Amount must be greater than 0")

        amount = round(amount, 2)

        # todo check max topup amount

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
            description="foooooobar test test",  # TODO: add customer tag uid and other stuff
            return_url=self.cfg.customer_portal.sumup_config.return_url,
            customer_id=str(current_customer.id),
            # redirect_url=self.cfg.customer_portal.sumup_config.redirect_url,
        )
        checkout_response = await self._create_sumup_checkout(checkout=create_checkout)

        await conn.execute(
            "insert into customer_sumup_checkout ("
            "   checkout_reference, amount, currency, merchant_code, description, return_url, id, status, date, "
            "   valid_until, customer_account_id"
            ") "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
            checkout_response.checkout_reference,
            checkout_response.amount,
            checkout_response.currency,
            checkout_response.merchant_code,
            checkout_response.description,
            checkout_response.return_url,
            checkout_response.id,
            checkout_response.status,
            checkout_response.date,
            None,
            int(checkout_response.customer_id),
        )

        return checkout_response
