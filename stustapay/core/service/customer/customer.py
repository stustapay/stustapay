# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
import logging
import re
from typing import Optional

import asyncpg
from pydantic import BaseModel
from schwifty import IBAN

from stustapay.core.config import Config
from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.schema.tree import Language
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.payout import PayoutService
from stustapay.core.service.customer.sumup import SumupService
from stustapay.core.service.tree.common import fetch_event_node_for_node
from stustapay.framework.database import Connection


class CustomerPortalApiConfig(BaseModel):
    test_mode: bool
    test_mode_message: str
    data_privacy_url: str
    contact_email: str
    about_page_url: str
    payout_enabled: bool
    currency_identifier: str
    sumup_topup_enabled: bool
    allowed_country_codes: Optional[list[str]]
    translation_texts: dict[Language, dict[str, str]]


class CustomerLoginSuccess(BaseModel):
    customer: Customer
    token: str


class CustomerBank(BaseModel):
    iban: str
    account_name: str
    email: str
    donation: float = 0.0


class CustomerService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("customer")

        self.sumup = SumupService(db_pool=db_pool, config=config, auth_service=auth_service)
        self.payout = PayoutService(
            db_pool=db_pool, config=config, auth_service=auth_service, config_service=config_service
        )

    @with_db_transaction
    async def login_customer(self, *, conn: Connection, pin: str) -> CustomerLoginSuccess:
        # Customer has hardware tag and pin
        customer = await conn.fetch_maybe_one(
            Customer,
            "select c.* from user_tag ut join customer c on ut.id = c.user_tag_id where ut.pin = $1",
            pin,
        )
        if customer is None:
            raise AccessDenied("Invalid pin")

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
    async def logout_customer(self, *, conn: Connection, current_customer: Customer, token: str) -> bool:
        token_payload = self.auth_service.decode_customer_jwt_payload(token)
        assert token_payload is not None
        assert current_customer.id == token_payload.customer_id

        result = await conn.execute(
            "delete from customer_session where customer = $1 and id = $2",
            current_customer.id,
            token_payload.session_id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_customer
    async def get_customer(self, *, current_customer: Customer) -> Optional[Customer]:
        return current_customer

    @with_db_transaction(read_only=True)
    @requires_customer
    async def get_orders_with_bon(self, *, conn: Connection, current_customer: Customer) -> list[OrderWithBon]:
        return await conn.fetch_many(
            OrderWithBon,
            "select o.*, b.generated as bon_generated from order_value_prefiltered("
            "   (select array_agg(o.id) from ordr o where customer_account_id = $1)"
            ") o left join bon b ON o.id = b.id order by o.booked_at desc",
            current_customer.id,
        )

    @with_db_transaction
    @requires_customer
    async def update_customer_info(
        self, *, conn: Connection, current_customer: Customer, customer_bank: CustomerBank
    ) -> None:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_customer.node_id)
        assert event_node is not None
        assert event_node.event is not None
        await self.check_payout_run(conn, current_customer)

        # check iban
        try:
            iban = IBAN(customer_bank.iban, validate_bban=True)
        except ValueError as exc:
            raise InvalidArgument("Provided IBAN is not valid") from exc

        # check country code
        if not event_node.event.sepa_enabled:
            raise InvalidArgument("SEPA payout is disabled")

        allowed_country_codes = event_node.event.sepa_allowed_country_codes
        if iban.country_code not in allowed_country_codes:
            raise InvalidArgument("Provided IBAN contains country code which is not supported")

        # check donation
        if customer_bank.donation < 0:
            raise InvalidArgument("Donation cannot be negative")
        if customer_bank.donation > current_customer.balance:
            raise InvalidArgument("Donation cannot be higher then your balance")

        # check sepa name
        if not re.match(r"^[a-zA-Z0-9\'\:\?\,-\(\)\/\ ÄäÖöÜüß\&\$\%]+$", customer_bank.account_name):
            raise InvalidArgument("Provided account name contains invalid special characters")

        # check email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", customer_bank.email):
            raise InvalidArgument("Provided email is not valid")

        # if customer_info does not exist create it, otherwise update it
        await conn.execute(
            "insert into customer_info (customer_account_id, iban, account_name, email, donation, donate_all, has_entered_info) "
            "values ($1, $2, $3, $4, $5, false, true) "
            "on conflict (customer_account_id) do update set iban = $2, account_name = $3, email = $4, donation = $5, donate_all = false, has_entered_info = true",
            current_customer.id,
            iban.compact,
            customer_bank.account_name,
            customer_bank.email,
            round(customer_bank.donation, 2),
        )

    async def check_payout_run(self, conn: Connection, current_customer: Customer) -> None:
        # if a payout is assigned, disallow updates.
        is_in_payout = await conn.fetchval(
            "select exists(select from payout where customer_account_id = $1)",
            current_customer.id,
        )
        if is_in_payout:
            raise InvalidArgument(
                "Your account is already scheduled for the next payout, so updates are no longer possible."
            )

    @with_db_transaction
    @requires_customer
    async def update_customer_info_donate_all(self, *, conn: Connection, current_customer: Customer) -> None:
        await self.check_payout_run(conn, current_customer)
        await conn.execute(
            "insert into customer_info (customer_account_id, donation, donate_all, has_entered_info) values ($1, null, true, true) "
            "on conflict (customer_account_id) do update set donation_all = true, has_entered_info = true",
            current_customer.id,
        )

    @with_db_transaction(read_only=True)
    async def get_api_config(self, *, conn: Connection, base_url: str) -> CustomerPortalApiConfig:
        node_id = await conn.fetchval(
            "select n.id from node n join event e on n.event_id = e.id where e.customer_portal_url = $1", base_url
        )
        if node_id is None:
            raise InvalidArgument("Invalid customer portal configuration")
        node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
        assert node is not None
        assert node.event is not None
        return CustomerPortalApiConfig(
            test_mode=self.cfg.core.test_mode,
            test_mode_message=self.cfg.core.test_mode_message,
            about_page_url=node.event.customer_portal_about_page_url,
            allowed_country_codes=node.event.sepa_allowed_country_codes,
            contact_email=node.event.customer_portal_contact_email,
            data_privacy_url=node.event.customer_portal_data_privacy_url,
            payout_enabled=node.event.sepa_enabled,
            sumup_topup_enabled=self.cfg.core.sumup_enabled and node.event.sumup_topup_enabled,
            translation_texts=node.event.translation_texts,
            currency_identifier=node.event.currency_identifier,
        )

    @with_db_transaction
    @requires_customer
    async def get_bon(self, *, conn: Connection, current_customer: Customer, bon_id: int) -> tuple[str, bytes]:
        blob = await conn.fetchrow(
            "select content, mime_type from bon b join ordr o on b.id = o.id "
            "where b.id = $1 and o.customer_account_id = $2",
            bon_id,
            current_customer.id,
        )
        if not blob:
            raise InvalidArgument("Bon not found")

        return blob["mime_type"], blob["content"]
