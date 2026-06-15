# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
import logging
import re
import secrets
from email.utils import formataddr
from typing import Optional

import asyncpg
from pydantic import BaseModel, EmailStr, Field
from schwifty import IBAN
from sftkit.database import Connection
from sftkit.error import AccessDenied, InvalidArgument
from sftkit.service import Service, with_db_transaction

from stustapay.core.banner_image import http_response_for_stored_banner
from stustapay.core.config import Config
from stustapay.core.schema.customer import (
    Customer,
    OrderWithBon,
    PayoutInfo,
    PayoutTransaction,
    SharedTopupContribution,
    SharedTopupLink,
    SharedTopupPublicInfo,
)
from stustapay.core.schema.language import Language
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.decorators import requires_customer
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.common import (
    fetch_customer_portal_event_node_id,
    fetch_shared_topup_link,
    hash_shared_topup_token,
)
from stustapay.core.service.customer.payout import PayoutService
from stustapay.core.service.email_templates import render_plain_text_payout_html
from stustapay.core.service.mail import MailService
from stustapay.core.service.order.sumup import SumupService
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_restricted_event_settings_for_node,
)

MAX_ACTIVE_SHARED_TOPUP_LINKS_PER_CUSTOMER = 10


def validate_name(name: str) -> bool:
    """Validate that a name only contains allowed characters."""
    return bool(re.match(r"^[a-zA-Z':,\-()\/\s.]+$", name))


class CustomerPortalApiConfig(BaseModel):
    test_mode: bool
    test_mode_message: str
    data_privacy_url: str
    contact_email: EmailStr
    about_page_url: str
    payout_enabled: bool
    donation_enabled: bool
    currency_identifier: str
    sumup_topup_enabled: bool
    sumup_topup_payment_methods: list[str] = Field(default_factory=list)
    allowed_country_codes: Optional[list[str]]
    translation_texts: dict[Language, dict[str, str]]
    event_name: str
    node_id: int
    banner_image_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None



class CustomerLoginSuccess(BaseModel):
    customer: Customer
    token: str


class CustomerBank(BaseModel):
    iban: str
    account_name: str
    email: str
    donation: float = 0.0


class CustomerService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("customer_service")

        self.sumup = SumupService(db_pool=db_pool, config=config, auth_service=auth_service)
        self.payout = PayoutService(
            db_pool=db_pool, config=config, auth_service=auth_service, config_service=config_service
        )

    @staticmethod
    def hash_shared_topup_token(token: str) -> str:
        return hash_shared_topup_token(token)

    @with_db_transaction
    @requires_customer
    async def create_shared_topup_link(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        label: str | None = None,
        customer_portal_base_url: str | None = None,
    ) -> SharedTopupLink:
        await conn.fetchval("select id from account where id = $1 for update", current_customer.id)
        active_link_count = await conn.fetchval(
            "select count(*) "
            "from shared_topup_link "
            "where customer_account_id = $1 "
            "  and revoked_at is null "
            "  and (expires_at is null or expires_at > now())",
            current_customer.id,
        )
        if active_link_count >= MAX_ACTIVE_SHARED_TOPUP_LINKS_PER_CUSTOMER:
            raise InvalidArgument("Too many active shared topup links")

        token = secrets.token_urlsafe(32)
        link = await conn.fetchrow(
            "insert into shared_topup_link (customer_account_id, token_hash, label) "
            "values ($1, $2, $3) "
            "returning id, created_at, expires_at, revoked_at, label",
            current_customer.id,
            self.hash_shared_topup_token(token),
            label,
        )
        return SharedTopupLink(token=token, **dict(link))

    @with_db_transaction(read_only=True)
    @requires_customer
    async def list_shared_topup_links(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> list[SharedTopupLink]:
        rows = await conn.fetch(
            "select id, null::text as token, created_at, expires_at, revoked_at, label "
            "from shared_topup_link "
            "where customer_account_id = $1 "
            "order by created_at desc",
            current_customer.id,
        )
        return [SharedTopupLink(**dict(row)) for row in rows]

    @with_db_transaction
    @requires_customer
    async def revoke_shared_topup_link(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        link_id: int,
        customer_portal_base_url: str | None = None,
    ) -> None:
        result = await conn.execute(
            "update shared_topup_link set revoked_at = now() "
            "where id = $1 and customer_account_id = $2 and revoked_at is null",
            link_id,
            current_customer.id,
        )
        if result == "UPDATE 0":
            raise InvalidArgument("Shared topup link not found")

    @with_db_transaction(read_only=True)
    @requires_customer
    async def list_shared_topup_contributions(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> list[SharedTopupContribution]:
        return await conn.fetch_many(
            SharedTopupContribution,
            "select "
            "  sto.order_uuid, "
            "  sto.contributor_name, "
            "  (((pso.order_content #>> '{}')::jsonb)->>'amount')::numeric as amount, "
            "  pso.status::text as status, "
            "  sto.created_at, "
            "  o.booked_at "
            "from shared_topup_order sto "
            "join pending_sumup_order pso on pso.uuid = sto.order_uuid "
            "left join ordr o on o.uuid = sto.order_uuid "
            "where sto.customer_account_id = $1 "
            "order by sto.created_at desc",
            current_customer.id,
        )

    @with_db_transaction(read_only=True)
    async def get_shared_topup_public_info(
        self,
        *,
        conn: Connection,
        token: str,
        customer_portal_base_url: str | None = None,
    ) -> SharedTopupPublicInfo:
        link = await self._fetch_shared_topup_link(
            conn=conn,
            token=token,
            customer_portal_base_url=customer_portal_base_url,
        )
        event_node = await fetch_event_node_for_node(conn=conn, node_id=link["node_id"])
        if event_node is None or event_node.event is None:
            raise AccessDenied("Invalid shared topup link")
        payment_methods = await self.sumup.get_available_payment_methods_for_node(
            conn=conn,
            node_id=event_node.id,
        )
        return SharedTopupPublicInfo(
            event_name=event_node.name,
            currency_identifier=event_node.event.currency_identifier,
            payment_methods=payment_methods,
        )

    async def _fetch_shared_topup_link(
        self,
        *,
        conn: Connection,
        token: str,
        customer_portal_base_url: str | None = None,
    ):
        return await fetch_shared_topup_link(
            conn=conn,
            token=token,
            customer_portal_base_url=customer_portal_base_url,
        )

    @with_db_transaction
    async def login_customer(
        self,
        *,
        conn: Connection,
        uid: int,
        pin: str,
        node_id: int,
        customer_portal_base_url: str | None = None,
    ) -> CustomerLoginSuccess:
        if customer_portal_base_url is not None:
            portal_event_node_id = await fetch_customer_portal_event_node_id(
                conn=conn,
                base_url=customer_portal_base_url,
            )
            requested_event_node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
            requested_event_node_id = requested_event_node.id if requested_event_node is not None else None
            if portal_event_node_id is None or requested_event_node_id != portal_event_node_id:
                raise AccessDenied("Login does not match current customer portal")

        customer = await conn.fetch_maybe_one(
            Customer,
            "select c.* from customer c "
            "   left join user_tag ut on ut.id = c.user_tag_id "
            "   left join ticket_voucher tv on tv.customer_account_id = c.id "
            "where (ut.pin = $1 or ut.pin = $2 or tv.token = $3) AND ut.uid = $4 AND c.node_id = $5",
            # TODO: restore case sensitivity
            pin.lower(),  # for simulator
            pin.upper(),  # for humans
            pin,
            uid,
            node_id,
        )
        if customer is None:
            raise AccessDenied("Invalid user tag or pin")

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
    async def logout_customer(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        token: str,
        customer_portal_base_url: str | None = None,
    ) -> bool:
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
    async def get_customer(
        self,
        *,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> Optional[Customer]:
        return current_customer

    @with_db_transaction(read_only=True)
    @requires_customer
    async def payout_info(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> PayoutInfo:
        # is customer registered for payout
        return await conn.fetch_one(
            PayoutInfo,
            "select "
            "   exists(select from payout p join payout_run pr on pr.id = p.payout_run_id "
            "       where p.customer_account_id = $1 and not pr.done and not pr.revoked) as in_payout_run, "
            "   ( "
            "       select pr.set_done_at "
            "       from payout_run pr "
            "       join payout p on pr.id = p.payout_run_id "
            "       where p.customer_account_id = $1 and pr.done and not pr.revoked "
            "       order by pr.set_done_at desc, pr.created_at desc, p.id desc "
            "       limit 1 "
            "    ) as payout_date",
            current_customer.id,
        )

    @with_db_transaction(read_only=True)
    @requires_customer
    async def get_orders_with_bon(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> list[OrderWithBon]:
        return await conn.fetch_many(
            OrderWithBon,
            "select o.*, case when b.bon_json is null then false else true end as bon_generated from order_value_prefiltered("
            "   (select array_agg(o.id) from ordr o where customer_account_id = $1), $2"
            ") o left join bon b ON o.id = b.id order by o.booked_at desc",
            current_customer.id,
            current_customer.node_id,
        )

    @with_db_transaction(read_only=True)
    @requires_customer
    async def get_payout_transactions(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_portal_base_url: str | None = None,
    ) -> list[PayoutTransaction]:
        return await conn.fetch_many(
            PayoutTransaction,
            "select t.amount, t.booked_at, a.name as target_account_name, a.type as target_account_type, t.id as transaction_id "
            "from transaction t join account a on t.target_account = a.id "
            "where t.order_id is null and t.source_account = $1 and t.target_account in (select id from account where type = 'cash_exit' or type = 'donation_exit' or type = 'sepa_exit')",
            current_customer.id,
        )

    @with_db_transaction
    @requires_customer
    async def update_customer_info(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        customer_bank: CustomerBank,
        mail_service: MailService,
        customer_portal_base_url: str | None = None,
    ) -> None:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_customer.node_id)
        if event_node.event is None:
            raise InvalidArgument("Invalid event node")

        await self.check_payout_run(conn, current_customer)

        # If donations are disabled, override any incoming donation value to 0
        if not event_node.event.donation_enabled and customer_bank.donation is not None and customer_bank.donation > 0:
            customer_bank.donation = 0.0

        # Validate IBAN
        iban = customer_bank.iban.strip()
        if not iban:
            raise InvalidArgument("IBAN is empty")
        try:
            iban_obj = IBAN(iban)
            iban = str(iban_obj)
        except ValueError:
            raise InvalidArgument("IBAN is not valid")

        account_name = customer_bank.account_name
        if account_name is not None:
            if not validate_name(account_name):
                raise InvalidArgument("Provided account name contains invalid special characters")

        # check if customer info record exists
        customer_info_exists = await conn.fetchval(
            "select exists(select from customer_info where customer_account_id = $1)", current_customer.id
        )

        if customer_info_exists:
            if customer_bank.donation is not None:
                await conn.execute(
                    "update customer_info set "
                    "   iban = $2, "
                    "   account_name = $3, "
                    "   email = $4, "
                    "   has_entered_info = true,"
                    "   donate_all = false, "
                    "   donation = $5 "
                    "where customer_account_id = $1",
                    current_customer.id,
                    iban,
                    account_name,
                    customer_bank.email,
                    customer_bank.donation,
                )
            else:
                await conn.execute(
                    "update customer_info set "
                    "   iban = $2, "
                    "   account_name = $3, "
                    "   email = $4, "
                    "   has_entered_info = true,"
                    "   donate_all = false "
                    "where customer_account_id = $1",
                    current_customer.id,
                    iban,
                    account_name,
                    customer_bank.email,
                )
        else:
            if customer_bank.donation is not None:
                await conn.execute(
                    "insert into customer_info "
                    "(customer_account_id, iban, account_name, email, has_entered_info, donate_all, donation, payout_export) "
                    "values ($1, $2, $3, $4, true, false, $5, true)",
                    current_customer.id,
                    iban,
                    account_name,
                    customer_bank.email,
                    customer_bank.donation,
                )
            else:
                await conn.execute(
                    "insert into customer_info "
                    "(customer_account_id, iban, account_name, email, has_entered_info, donate_all, payout_export) "
                    "values ($1, $2, $3, $4, true, false, true)",
                    current_customer.id,
                    iban,
                    account_name,
                    customer_bank.email,
                )

        # get updated customer information
        updated_customer = await conn.fetch_one(
            Customer,
            "select * from customer where id = $1",
            current_customer.id,
        )

        # Store email-related information to be used outside the transaction
        email_to_send = None
        if updated_customer.email is not None:
            res_config = await fetch_restricted_event_settings_for_node(conn, updated_customer.node_id)
            if res_config.email_enabled and res_config.payout_registered_message is not None:
                message = res_config.payout_registered_message.format(**updated_customer.model_dump())
                payout_sender = res_config.payout_sender or res_config.email_default_sender
                email_to_send = {
                    "subject": res_config.payout_registered_subject,
                    "message": message,
                    "html_message": render_plain_text_payout_html(message, res_config.payout_registered_subject),
                    "from_addr": (
                        formataddr((f"{event_node.name} Auszahlung", payout_sender))
                        if payout_sender
                        else None
                    ),
                    "to_addr": updated_customer.email,
                    "node_id": updated_customer.node_id,
                }

        return email_to_send

    # New method to send email outside transaction
    async def send_payout_registered_email(self, mail_service: MailService, email_info: dict) -> None:
        if email_info:
            try:
                await mail_service.send_mail(
                    subject=email_info["subject"],
                    text_message=email_info["message"],
                    html_message=email_info["html_message"],
                    from_addr=email_info["from_addr"],
                    to_addr=email_info["to_addr"],
                    node_id=email_info["node_id"],
                )
            except Exception as e:
                self.logger.exception(f"Failed to send payout registration email: {e}")
                # Email sending failure should not affect the overall operation

    async def check_payout_run(self, conn: Connection, current_customer: Customer) -> None:
        # if a payout is assigned, disallow updates.
        is_in_payout = await conn.fetchval(
            "select exists("
            "   select from payout p "
            "   join payout_run pr on pr.id = p.payout_run_id "
            "   where p.customer_account_id = $1 and not pr.done and not pr.revoked"
            ")",
            current_customer.id,
        )
        if is_in_payout:
            raise InvalidArgument(
                "Your account is already scheduled for the next payout, so updates are no longer possible."
            )

    @with_db_transaction
    @requires_customer
    async def update_customer_info_donate_all(
        self,
        *,
        conn: Connection,
        current_customer: Customer,
        mail_service: MailService,
        customer_portal_base_url: str | None = None,
    ) -> None:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_customer.node_id)
        if event_node.event is None:
            raise InvalidArgument("Invalid event node")
        
        # Check if donations are enabled
        if not event_node.event.donation_enabled:
            raise InvalidArgument("Donations are currently disabled")
        
        await self.check_payout_run(conn, current_customer)
        await conn.execute(
            "update customer_info set donation=null, donate_all=true, has_entered_info=true "
            "where customer_account_id = $1",
            current_customer.id,
        )

    @with_db_transaction(read_only=True)
    async def get_api_config(self, *, conn: Connection, base_url: str) -> CustomerPortalApiConfig:
        node_id = await fetch_customer_portal_event_node_id(conn=conn, base_url=base_url)
        if node_id is None:
            raise InvalidArgument("Invalid customer portal configuration")
        node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
        assert node is not None
        assert node.event is not None
        
        # Check if banner image exists
        has_banner = await conn.fetchval(
            "select exists(select 1 from event e join node n on n.event_id = e.id where n.id = $1 and e.banner_image is not null)",
            node_id
        )
        banner_image_url = f"/api/banner/{node_id}" if has_banner else None
        sumup_topup_enabled = self.config.core.sumup_enabled and node.event.sumup_topup_enabled
        sumup_topup_payment_methods: list[str] = []
        if sumup_topup_enabled:
            try:
                sumup_topup_payment_methods = await self.sumup.get_available_payment_methods_for_node(
                    conn=conn, node_id=node_id
                )
            except Exception:  # pylint: disable=broad-except
                self.logger.exception("Unexpected error while loading SumUp payment methods for node %s", node_id)
                sumup_topup_payment_methods = []
        
        return CustomerPortalApiConfig(
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
            about_page_url=node.event.customer_portal_about_page_url,
            allowed_country_codes=node.event.sepa_allowed_country_codes,
            contact_email=node.event.customer_portal_contact_email,
            data_privacy_url=node.event.customer_portal_data_privacy_url,
            payout_enabled=node.event.sepa_enabled,
            donation_enabled=node.event.donation_enabled,
            sumup_topup_enabled=sumup_topup_enabled,
            sumup_topup_payment_methods=sumup_topup_payment_methods,
            translation_texts=node.event.translation_texts,
            currency_identifier=node.event.currency_identifier,
            event_name=node.name,
            node_id=node_id,
            banner_image_url=banner_image_url,
            primary_color=node.event.customer_portal_primary_color,
            secondary_color=node.event.customer_portal_secondary_color,
            background_color=node.event.customer_portal_background_color,
        )

    @with_db_transaction(read_only=True)
    async def get_event_banner(self, *, conn: Connection, node_id: int) -> Optional[dict]:
        """Retrieve banner image data for an event node."""
        result = await conn.fetchrow(
            "select e.banner_image, e.banner_image_mime_type "
            "from event e join node n on n.event_id = e.id "
            "where n.id = $1 and e.banner_image is not null",
            node_id
        )
        if result is None:
            return None
        payload = http_response_for_stored_banner(result["banner_image"])
        assert payload is not None
        return payload
