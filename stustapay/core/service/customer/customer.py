# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
import csv
import datetime
import logging
import re
from typing import Optional

import asyncpg
from pydantic import BaseModel
from schwifty import IBAN
from sepaxml import SepaTransfer

from stustapay.core.config import Config
from stustapay.core.schema.config import PublicConfig, SEPAConfig
from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, AccessDenied
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.sumup import SumupService


class PublicCustomerApiConfig(PublicConfig):
    data_privacy_url: str
    contact_email: str
    about_page_url: str
    allowed_country_codes: list[str]


class CustomerLoginSuccess(BaseModel):
    customer: Customer
    token: str


class Payout(BaseModel):
    customer_account_id: int
    iban: str
    account_name: str
    email: str
    user_tag_uid: int
    balance: float
    payout_run_id: Optional[int]


class CustomerBank(BaseModel):
    iban: str
    account_name: str
    email: str
    donation: float = 0.0


async def get_number_of_payouts(conn: asyncpg.Connection, payout_run_id: Optional[int]) -> int:
    if payout_run_id is None:
        return await conn.fetchval("select count(*) from payout where payout_run_id is null")
    return await conn.fetchval("select count(*) from payout where payout_run_id = $1", payout_run_id)


async def create_payout_run(conn: asyncpg.Connection, created_by: str) -> tuple[int, int]:
    payout_run_id = await conn.fetchval(
        "insert into payout_run (created_at, created_by) values (now(), $1) returning id", created_by
    )
    # set payout_run_id for all pending payouts
    await conn.execute(
        "update customer_info c set payout_run_id = $1 where c.customer_account_id in "
        "(select p.customer_account_id from payout p where p.payout_run_id is null)",
        payout_run_id,
    )
    number_of_payouts = await conn.fetchval("select count(*) from payout where payout_run_id = $1", payout_run_id)
    return payout_run_id, number_of_payouts


async def get_customer_bank_data(
    conn: asyncpg.Connection, payout_run_id: int, max_export_items_per_batch: int, ith_batch: int = 0
) -> list[Payout]:
    rows = await conn.fetch(
        "select * from payout where payout_run_id = $1 order by user_tag_uid asc limit $2 offset $3",
        payout_run_id,
        max_export_items_per_batch,
        ith_batch * max_export_items_per_batch,
    )
    return [Payout.parse_obj(row) for row in rows]


async def csv_export(
    customers_bank_data: list[Payout],
    output_path: str,
    sepa_config: SEPAConfig,
    currency_ident: str,
    execution_date: datetime.date,
) -> None:
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
                    sepa_config.description.format(user_tag_uid=hex(customer.user_tag_uid)),
                    execution_date.isoformat(),
                ]
            )


async def sepa_export(
    customers_bank_data: list[Payout],
    output_path: str,
    sepa_config: SEPAConfig,
    currency_ident: str,
    execution_date: datetime.date,
) -> None:
    if len(customers_bank_data) == 0:
        # avoid error in sepa library
        logging.warning("No customers with bank data found. Nothing to export.")
        return

    iban = IBAN(sepa_config.sender_iban)
    config = {
        "name": sepa_config.sender_name,
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
            "description": sepa_config.description.format(user_tag_uid=hex(customer.user_tag_uid)),
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
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("customer")

        self.sumup = SumupService(
            db_pool=db_pool, config=config, auth_service=auth_service, config_service=config_service
        )

    @with_db_transaction
    async def login_customer(self, *, conn: asyncpg.Connection, uid: int, pin: str) -> CustomerLoginSuccess:
        # Customer has hardware tag and pin
        row = await conn.fetchrow(
            "select c.* from user_tag u join customer c on u.uid = c.user_tag_uid where u.uid = $1 and u.pin = $2",
            uid,
            pin,
        )
        if row is None:
            raise AccessDenied("Invalid user tag uid or pin")

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
        assert token_payload is not None
        assert current_customer.id == token_payload.customer_id

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
    ) -> Optional[list[OrderWithBon]]:
        rows = await conn.fetch(
            "select * from order_value_with_bon where customer_account_id = $1 order by booked_at DESC",
            current_customer.id,
        )
        if rows is None:
            return None
        orders_with_bon: list[OrderWithBon] = [OrderWithBon.parse_obj(row) for row in rows]
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

        # check country code
        allowed_country_codes = (await self.config_service.get_sepa_config(conn=conn)).allowed_country_codes
        if iban.country_code not in allowed_country_codes:
            raise InvalidArgument("Provided IBAN contains country code which is not supported")

        # check donation
        if customer_bank.donation < 0:
            raise InvalidArgument("Donation cannot be negative")
        if customer_bank.donation > current_customer.balance:
            raise InvalidArgument("Donation cannot be higher then your balance")

        # check email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", customer_bank.email):
            raise InvalidArgument("Provided email is not valid")

        # if customer_info does not exist create it, otherwise update it
        await conn.execute(
            "insert into customer_info (customer_account_id, iban, account_name, email, donation) values ($1, $2, $3, $4, $5) "
            "on conflict (customer_account_id) do update set iban = $2, account_name = $3, email = $4, donation = $5",
            current_customer.id,
            iban.compact,
            customer_bank.account_name,
            customer_bank.email,
            round(customer_bank.donation, 2),
        )

    @with_db_transaction
    @requires_customer
    async def update_customer_donation(self, *, conn: asyncpg.Connection, current_customer: Customer) -> None:
        # if customer_info does not exist create it, otherwise update it
        await conn.execute(
            "insert into customer_info (customer_account_id, donation) values ($1, $2) "
            "on conflict (customer_account_id) do update set donation = $2",
            current_customer.id,
            round(current_customer.balance, 2),
        )

    async def get_public_customer_api_config(self) -> PublicCustomerApiConfig:
        public_config = await self.config_service.get_public_config()
        allowed_country_codes = (await self.config_service.get_sepa_config()).allowed_country_codes

        return PublicCustomerApiConfig(
            test_mode=self.cfg.core.test_mode,
            test_mode_message=self.cfg.core.test_mode_message,
            sumup_topup_enabled=public_config.sumup_topup_enabled,
            currency_identifier=public_config.currency_identifier,
            currency_symbol=public_config.currency_symbol,
            data_privacy_url=self.cfg.customer_portal.data_privacy_url,
            contact_email=public_config.contact_email,
            about_page_url=self.cfg.customer_portal.about_page_url,
            allowed_country_codes=allowed_country_codes,
        )
