# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
import asyncio
import csv
import datetime
import logging
import re
import uuid
from typing import Optional, List
import aiohttp

import asyncpg
from pydantic import BaseModel
from stustapay.core.config import Config
from stustapay.core.schema.config import PublicConfig
from stustapay.core.schema.customer import BaseCustomerCheckout, Customer, OrderWithBon
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, ServiceException
from schwifty import IBAN
from sepaxml import SepaTransfer

from stustapay.core.service.config import ConfigService


class CustomerLoginSuccess(BaseModel):
    customer: Customer
    token: str


class CustomerBankData(BaseModel):
    iban: str
    account_name: str
    email: str
    user_tag_uid: int
    balance: float


class CustomerBank(BaseModel):
    iban: str
    account_name: str
    email: str


class PublicCustomerApiConfig(PublicConfig):
    data_privacy_url: str
    contact_email: str
    about_page_url: str

class CreateCheckout(BaseModel):
    amount: float


class SumupCreateCheckout(BaseModel):
    checkout_reference: str
    amount: float
    currency: str
    merchant_code: str
    pay_to_email: Optional[str]
    description: Optional[str]
    return_url: Optional[str]
    customer_id: Optional[str]
    redirect_url: Optional[str]


class SumupCreateCheckoutResponse(BaseCustomerCheckout):
    customer_id: str


async def get_number_of_customers(conn: asyncpg.Connection) -> int:
    # number of customers with iban not null and balance > 0
    return await conn.fetchval("select count(*) from customer c where c.iban is not null and round(c.balance, 2) > 0")


async def get_customer_bank_data(
    conn: asyncpg.Connection, max_export_items_per_batch: int, ith_batch: int = 0
) -> List[CustomerBankData]:
    rows = await conn.fetch(
        "select c.iban, c.account_name, c.email, c.user_tag_uid, c.balance "
        "from customer c "
        "where c.iban is not null and round(c.balance, 2) > 0 "
        "limit $1 offset $2",
        max_export_items_per_batch,
        ith_batch * max_export_items_per_batch,
    )
    return [CustomerBankData.parse_obj(row) for row in rows]


def csv_export(
    customers_bank_data: list[CustomerBankData],
    output_path: str,
    cfg: Config,
    currency_ident: str,
    execution_date: Optional[datetime.date],
) -> None:
    """If execution_date is None, the execution date will be set to today + 2 days."""
    with open(output_path, "w") as f:
        execution_date = execution_date or datetime.date.today() + datetime.timedelta(days=2)
        writer = csv.writer(f)
        fields = ["beneficiary_name", "iban", "amount", "currency", "reference", "execution_date"]
        writer.writerow(fields)
        for customer in customers_bank_data:
            writer.writerow(
                [
                    customer.account_name,
                    customer.iban,
                    round(customer.balance, 2),
                    currency_ident,
                    cfg.customer_portal.sepa_config.description.format(user_tag_uid=hex(customer.user_tag_uid)),
                    execution_date.isoformat(),
                ]
            )


def sepa_export(
    customers_bank_data: list[CustomerBankData],
    output_path: str,
    cfg: Config,
    currency_ident: str,
    execution_date: Optional[datetime.date],
) -> None:
    """If execution_date is None, the execution date will be set to today + 2 days."""
    if len(customers_bank_data) == 0:
        # avoid error in sepa library
        logging.warning("No customers with bank data found. Nothing to export.")
        return

    execution_date = execution_date or datetime.date.today() + datetime.timedelta(days=2)
    iban = IBAN(cfg.customer_portal.sepa_config.sender_iban)
    config = {
        "name": cfg.customer_portal.sepa_config.sender_name,
        "IBAN": iban.compact,
        "BIC": str(iban.bic),
        "batch": len(customers_bank_data) > 1,
        "currency": currency_ident,  # ISO 4217
    }
    sepa = SepaTransfer(config, clean=True)
    if config["BIC"] == "None":
        raise ValueError("BIC couldn't calculated correctly from given IBAN")
    if execution_date < datetime.date.today():
        raise ValueError("Execution date cannot be in the past")

    for customer in customers_bank_data:
        payment = {
            "name": customer.account_name,
            "IBAN": IBAN(customer.iban).compact,
            "BIC": str(IBAN(customer.iban).bic),
            "amount": round(customer.balance * 100),  # in cents
            "execution_date": execution_date,
            "description": cfg.customer_portal.sepa_config.description.format(user_tag_uid=hex(customer.user_tag_uid)),
        }

        if not re.match(r"^[a-zA-Z0-9 \-.,:()/?'+]*$", payment["description"]):  # type: ignore
            raise ValueError("Description contains invalid characters")
        if payment["amount"] <= 0:  # type: ignore
            raise ValueError("Amount must be greater than 0")
        if payment["BIC"] == "None":
            raise ValueError("BIC couldn't calculated correctly from given IBAN")

        sepa.add_payment(payment)

    sepa_xml = sepa.export(validate=True, pretty_print=True)

    # create sepa xml file for sepa transfer to upload in online banking
    with open(output_path, "wb") as f:
        f.write(sepa_xml)


class CustomerService(DBService):
    SUMUP_URL = "https://api.sumup.com/v0.1/checkouts"
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service

    @with_db_transaction
    async def login_customer(self, *, conn: asyncpg.Connection, uid: int, pin: str) -> Optional[CustomerLoginSuccess]:
        # Customer has hardware tag and pin
        row = await conn.fetchrow(
            "select c.* from user_tag u join customer c on u.uid = c.user_tag_uid where u.uid = $1 and u.pin = $2",
            uid,
            pin,
        )
        if row is None:
            return None

        customer = Customer.parse_obj(row)

        session_id = await conn.fetchval(
            "insert into customer_session (customer) values ($1) returning id", customer.id
        )
        token = self.auth_service.create_customer_access_token(
            CustomerTokenMetadata(customer_id=customer.id, session_id=session_id)
        )
        return CustomerLoginSuccess(
            customer=customer,
            token=token,
        )

    @with_db_transaction
    @requires_customer
    async def logout_customer(self, *, conn: asyncpg.Connection, current_customer: Customer, token: str) -> bool:
        token_payload = self.auth_service.decode_customer_jwt_payload(token)
        if token_payload is None:
            return False

        if current_customer.id != token_payload.customer_id:
            return False

        result = await conn.execute(
            "delete from customer_session where customer = $1 and id = $2",
            current_customer.id,
            token_payload.session_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_customer
    async def get_customer(self, *, current_customer: Customer) -> Optional[Customer]:
        return current_customer

    @with_db_transaction
    @requires_customer
    async def get_orders_with_bon(
        self, *, conn: asyncpg.Connection, current_customer: Customer
    ) -> Optional[List[OrderWithBon]]:
        rows = await conn.fetch(
            "select * from order_value_with_bon where customer_account_id = $1 order by booked_at DESC",
            current_customer.id,
        )
        if rows is None:
            return None
        orders_with_bon: List[OrderWithBon] = [OrderWithBon.parse_obj(row) for row in rows]
        for order_with_bon in orders_with_bon:
            if order_with_bon.bon_output_file is not None:
                order_with_bon.bon_output_file = self.cfg.customer_portal.base_bon_url.format(
                    bon_output_file=order_with_bon.bon_output_file
                )
        return orders_with_bon

    @with_db_transaction
    @requires_customer
    async def update_customer_info(
        self, *, conn: asyncpg.Connection, current_customer: Customer, customer_bank: CustomerBank
    ) -> None:
        # check iban
        try:
            iban = IBAN(customer_bank.iban, validate_bban=True)
        except ValueError as exc:
            raise InvalidArgument("Provided IBAN is not valid") from exc
        # TODO: check for countries which are in sepa but do not accept euro

        # if customer_info does not exist create it, otherwise update it
        await conn.execute(
            "insert into customer_info (customer_account_id, iban, account_name, email) values ($1, $2, $3, $4) "
            "on conflict (customer_account_id) do update set iban = $2, account_name = $3, email = $4",
            current_customer.id,
            iban.compact,
            customer_bank.account_name,
            customer_bank.email,
        )

    async def get_public_customer_api_config(self) -> PublicCustomerApiConfig:
        public_config = await self.config_service.get_public_config()
        return PublicCustomerApiConfig(
            currency_identifier=public_config.currency_identifier,
            currency_symbol=public_config.currency_symbol,
            data_privacy_url=self.cfg.customer_portal.data_privacy_url,
            contact_email=self.cfg.customer_portal.contact_email,
            about_page_url=self.cfg.customer_portal.about_page_url,
        )

    @with_db_transaction
    @requires_customer
    async def create_checkout(self, *, conn: asyncpg.Connection, current_customer: Customer, 
                              amount: float) -> str:
        # check amount
        if amount <= 0:
            raise InvalidArgument("Amount must be greater than 0")

        amount = round(amount, 2)

        # create checkout reference as uuid
        checkout_reference = uuid.uuid4()
        # check if checkout reference already exists
        while await conn.fetchval("select exists(select * from checkout where checkout_reference = $1)", checkout_reference):
            checkout_reference = uuid.uuid4()
        

        create_checkout = SumupCreateCheckout(
            checkout_reference=checkout_reference,
            amount=amount,
            currency=self.config_service.get_public_config().currency_identifier,
            merchant_code="",
            pay_to_email="",
            description="",
            return_url="",
            customer_id=f"{current_customer.user_tag_uid_hex}",
            redirect_url="",
        )

        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {self.cfg.customer_portal.sumup_client_secret}'
        }

        # response = requests.request("POST", self.SUMUP_URL, headers=headers, data=create_checkout.json())

        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                async with session.post(self.SUMUP_URL, data=create_checkout.json(), timeout=2) as response:

                    if not response.ok:
                        logging.error(f"Sumup API returned status code {response.status} with body {response.text}")
                        raise ServiceException("Sumup API returned an error")


                    response_text = await response.text()

            except asyncio.TimeoutError as e:
                logging.error("Sumup API timeout")
                raise ServiceException("Sumup API timeout") from e
            

        checkout_response = SumupCreateCheckoutResponse.parse_obj(response_text)

        if checkout_response.status == "FAILED":
            logging.error(f"Sumup API returned status FAILED with body {response.text}")
            raise ServiceException("Sumup API returned FAILED")

        
        # save to database
        customer_checkout = checkout_response.dict().update({"customer_id": int(checkout_response.customer_id)})
        await conn.execute(
            "insert into customer_checkout (checkout_reference, amount, currency, merchant_code, pay_to_email, description, return_url, id, status, date, valid_until, customer_id "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            customer_checkout.checkout_reference,
            customer_checkout.amount,
            customer_checkout.currency,
            customer_checkout.merchant_code,
            customer_checkout.pay_to_email,
            customer_checkout.description,
            customer_checkout.return_url,
            customer_checkout.id,
            customer_checkout.status,
            customer_checkout.date,
            customer_checkout.valid_until,
            customer_checkout.customer_id,
        )

        return checkout_response.id

    # TODO: create async thread which regularly checks the pending actions over the sumup api
    # https://developer.sumup.com/docs/api/retrieve-a-checkout/

    # TODO: create service function that checks the checkout status when the client is redirected to the return_url

