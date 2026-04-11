from __future__ import annotations

import asyncio
import random
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime

import pytest
from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import NewTicketSale, NewTopUp, PaymentMethod, UserTagScan
from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.ticket import NewTicket, NewTicketScan, Ticket
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, Node
from stustapay.core.schema.user import ADMIN_ROLE_ID, NewUser, NewUserRole, NewUserToRoles, Privilege, UserTag
from stustapay.core.schema.user_tag import NewUserTag
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.order.pending_order import fetch_order_by_uuid
from stustapay.core.service.tax_rate import fetch_tax_rate_none
from stustapay.core.service.tree.service import create_event
from stustapay.core.service.user_tag import create_user_tags
from stustapay.payment.sumup.api import SumUpCheckout, SumUpCheckoutStatus

from .conftest import START_BALANCE, Customer, LoginSupervisedUser


@dataclass
class EventUserTag:
    id: int
    uid: int
    pin: str


@dataclass
class EventContext:
    node: Node
    terminal_token: str
    customer_tag: EventUserTag | None = None
    ticket_tag: EventUserTag | None = None
    ticket: Ticket | None = None


def _new_event(name: str, customer_portal_url: str, merchant_code: str) -> NewEvent:
    return NewEvent(
        name=name,
        description="",
        customer_portal_url=customer_portal_url,
        customer_portal_contact_email="test@test.support.test.com",
        customer_portal_about_page_url=f"{customer_portal_url}/about",
        customer_portal_data_privacy_url=f"{customer_portal_url}/privacy",
        currency_identifier="EUR",
        sepa_enabled=True,
        sepa_sender_name="Event Foobar",
        sepa_description="foobar {user_tag_uid}",
        sepa_sender_iban="DE89370400440532013000",
        sepa_allowed_country_codes=["DE"],
        bon_title="",
        bon_issuer="",
        bon_address="",
        max_account_balance=150,
        sumup_topup_enabled=True,
        sumup_payment_enabled=True,
        sumup_affiliate_key="sup_afk_test_affiliate",
        sumup_api_key=f"test_api_key_{merchant_code}",
        sumup_merchant_code=merchant_code,
        ust_id="",
        email_enabled=False,
        email_default_sender=None,
        email_smtp_host=None,
        email_smtp_port=None,
        email_smtp_username=None,
        email_smtp_password=None,
        payout_done_subject="[StuStaPay] Payout Completed",
        payout_done_message="done",
        payout_registered_subject="[StuStaPay] Registered for Payout",
        payout_registered_message="registered",
        payout_sender=None,
        pretix_presale_enabled=False,
        pretix_api_key=None,
        pretix_event=None,
        pretix_organizer=None,
        pretix_shop_url=None,
        pretix_ticket_ids=None,
    )


async def _create_user_tag_secret(conn: Connection, node_id: int) -> int:
    return await conn.fetchval(
        "insert into user_tag_secret (node_id, key0, key1) values "
        "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
        "returning id",
        node_id,
    )


async def _create_event_tag(conn: Connection, node_id: int, secret_id: int, uid: int | None = None) -> EventUserTag:
    tag_uid = uid if uid is not None else random.randint(1, 2**32 - 1)
    pin = secrets.token_hex(16)
    await create_user_tags(
        conn=conn,
        node_id=node_id,
        tags=[NewUserTag(uid=tag_uid, pin=pin, secret_id=secret_id)],
    )
    tag_id = await conn.fetchval("select id from user_tag where node_id = $1 and uid = $2", node_id, tag_uid)
    assert tag_id is not None
    return EventUserTag(id=tag_id, uid=tag_uid, pin=pin)


async def _configure_event_sumup(conn: Connection, node_id: int, customer_portal_url: str, merchant_code: str):
    event_id = await conn.fetchval("select event_id from node where id = $1", node_id)
    assert event_id is not None
    await conn.execute(
        "update event set customer_portal_url = $2, customer_portal_about_page_url = $3, "
        "customer_portal_data_privacy_url = $4, sumup_topup_enabled = true, sumup_payment_enabled = true, "
        "sumup_affiliate_key = $5, sumup_api_key = $6, sumup_merchant_code = $7 where id = $1",
        event_id,
        customer_portal_url,
        f"{customer_portal_url}/about",
        f"{customer_portal_url}/privacy",
        "sup_afk_test_affiliate",
        f"test_api_key_{merchant_code}",
        merchant_code,
    )


async def _get_system_balance(conn: Connection, node: Node, account_type: AccountType) -> float:
    return (await get_system_account_for_node(conn=conn, node=node, account_type=account_type)).balance


async def _create_event_context(
    conn: Connection,
    *,
    name: str,
    customer_portal_url: str,
    merchant_code: str,
    global_admin_token: str,
    user_service,
    till_service,
    terminal_service,
    ticket_service,
    create_customer: bool = False,
    create_ticket_catalog: bool = False,
) -> EventContext:
    node = await create_event(
        conn=conn,
        parent_id=ROOT_NODE_ID,
        event=_new_event(name=name, customer_portal_url=customer_portal_url, merchant_code=merchant_code),
    )
    secret_id = await _create_user_tag_secret(conn, node.id)

    admin_tag = await _create_event_tag(conn, node.id, secret_id)
    admin_user = await user_service.create_user_no_auth(
        node_id=node.id,
        new_user=NewUser(
            login=f"{name}-admin-{secrets.token_hex(8)}",
            display_name="Admin",
            description="",
            user_tag_uid=admin_tag.uid,
            user_tag_pin=admin_tag.pin,
        ),
        password="rolf",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=node.id,
        user_to_roles=NewUserToRoles(user_id=admin_user.id, role_ids=[ADMIN_ROLE_ID]),
    )
    admin_login = await user_service.login_user(username=admin_user.login, password="rolf")
    assert admin_login.success is not None
    admin_token = admin_login.success.token

    cashier_role = await user_service.create_user_role(
        token=admin_token,
        node_id=node.id,
        new_role=NewUserRole(
            name=f"{name}-cashier",
            is_privileged=False,
            privileges=[Privilege.can_book_orders, Privilege.supervised_terminal_login],
        ),
    )
    cashier_tag = await _create_event_tag(conn, node.id, secret_id)
    cashier_user = await user_service.create_user_no_auth(
        node_id=node.id,
        new_user=NewUser(
            login=f"{name}-cashier-{secrets.token_hex(8)}",
            display_name="Cashier",
            description="",
            user_tag_uid=cashier_tag.uid,
            user_tag_pin=cashier_tag.pin,
        ),
        password="rolf",
    )
    await user_service.update_user_to_roles(
        token=admin_token,
        node_id=node.id,
        user_to_roles=NewUserToRoles(user_id=cashier_user.id, role_ids=[cashier_role.id]),
    )

    till_layout = await till_service.layout.create_layout(
        token=admin_token,
        node_id=node.id,
        layout=NewTillLayout(name=f"{name}-layout", description="", button_ids=[]),
    )
    till_profile = await till_service.profile.create_profile(
        token=admin_token,
        node_id=node.id,
        profile=NewTillProfile(
            name=f"{name}-profile",
            description="",
            layout_id=till_layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=False,
            enable_ssp_payment=True,
            enable_cash_payment=False,
            enable_card_payment=True,
        ),
    )
    terminal = await terminal_service.create_terminal(
        token=admin_token,
        node_id=node.id,
        terminal=NewTerminal(name=f"{name}-terminal", description=""),
    )
    till = await till_service.create_till(
        token=admin_token,
        node_id=node.id,
        till=NewTill(
            name=f"{name}-till",
            active_profile_id=till_profile.id,
            terminal_id=terminal.id,
        ),
    )
    registration = await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)
    terminal_token = registration.token
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=admin_tag.uid),
        user_role_id=ADMIN_ROLE_ID,
    )
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=cashier_tag.uid),
        user_role_id=cashier_role.id,
    )

    customer_tag = None
    if create_customer:
        customer_tag = await _create_event_tag(conn, node.id, secret_id)
        await conn.execute(
            "insert into account (node_id, user_tag_id, type, balance) values ($1, $2, 'private', $3)",
            node.id,
            customer_tag.id,
            START_BALANCE,
        )

    ticket_tag = None
    ticket = None
    if create_ticket_catalog:
        tax_rate_none = await fetch_tax_rate_none(conn=conn, node=node)
        ticket = await ticket_service.create_ticket(
            token=admin_token,
            node_id=node.id,
            ticket=NewTicket(
                name=f"{name}-ticket",
                price=12,
                tax_rate_id=tax_rate_none.id,
                initial_top_up_amount=8,
                is_locked=True,
                restrictions=[],
            ),
        )
        await till_service.layout.update_layout(
            token=admin_token,
            node_id=node.id,
            layout_id=till_layout.id,
            layout=NewTillLayout(
                name=till_layout.name,
                description=till_layout.description,
                button_ids=[],
                ticket_ids=[ticket.id],
            ),
        )
        ticket_tag = await _create_event_tag(conn, node.id, secret_id)

    assert till.id is not None
    return EventContext(
        node=node,
        terminal_token=terminal_token,
        customer_tag=customer_tag,
        ticket_tag=ticket_tag,
        ticket=ticket,
    )


async def test_multi_event_sumup_processing_stays_event_scoped(
    db_connection: Connection,
    global_admin_token: str,
    user_service,
    till_service,
    terminal_service,
    ticket_service,
    order_service,
    event_node: Node,
    terminal_token: str,
    customer: Customer,
    cashier,
    login_supervised_user: LoginSupervisedUser,
):
    await _configure_event_sumup(
        db_connection,
        node_id=event_node.id,
        customer_portal_url="http://event-a.local",
        merchant_code="MERCHANT_A",
    )
    event_b = await _create_event_context(
        db_connection,
        name="event-b",
        customer_portal_url="http://event-b.local",
        merchant_code="MERCHANT_B",
        global_admin_token=global_admin_token,
        user_service=user_service,
        till_service=till_service,
        terminal_service=terminal_service,
        ticket_service=ticket_service,
        create_ticket_catalog=True,
    )
    event_c = await _create_event_context(
        db_connection,
        name="event-c",
        customer_portal_url="http://event-c.local",
        merchant_code="MERCHANT_C",
        global_admin_token=global_admin_token,
        user_service=user_service,
        till_service=till_service,
        terminal_service=terminal_service,
        ticket_service=ticket_service,
        create_customer=True,
    )
    assert event_b.ticket is not None
    assert event_b.ticket_tag is not None
    assert event_c.customer_tag is not None

    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    pending_topup_a = await order_service.check_topup(
        token=terminal_token,
        new_topup=NewTopUp(
            uuid=uuid.uuid4(),
            amount=20,
            payment_method=PaymentMethod.sumup,
            customer_tag_uid=customer.tag.uid,
        ),
    )
    await order_service.book_topup(
        token=terminal_token,
        new_topup=NewTopUp(
            uuid=pending_topup_a.uuid,
            amount=pending_topup_a.amount,
            payment_method=PaymentMethod.sumup,
            customer_tag_uid=customer.tag.uid,
        ),
        pending=True,
    )

    scan_result = await order_service.check_ticket_scan(
        token=event_b.terminal_token,
        new_ticket_scan=NewTicketScan(
            customer_tags=[UserTagScan(tag_uid=event_b.ticket_tag.uid, tag_pin=event_b.ticket_tag.pin)],
        ),
    )
    assert scan_result is not None
    pending_ticket_b = await order_service.check_ticket_sale(
        token=event_b.terminal_token,
        new_ticket_sale=NewTicketSale(
            uuid=uuid.uuid4(),
            customer_tags=[UserTagScan(tag_uid=event_b.ticket_tag.uid, tag_pin=event_b.ticket_tag.pin)],
            payment_method=PaymentMethod.sumup,
        ),
    )
    await order_service.book_ticket_sale(
        token=event_b.terminal_token,
        new_ticket_sale=NewTicketSale(
            uuid=pending_ticket_b.uuid,
            customer_tags=[UserTagScan(tag_uid=event_b.ticket_tag.uid, tag_pin=event_b.ticket_tag.pin)],
            payment_method=PaymentMethod.sumup,
        ),
        pending=True,
    )

    pending_topup_c = await order_service.check_topup(
        token=event_c.terminal_token,
        new_topup=NewTopUp(
            uuid=uuid.uuid4(),
            amount=30,
            payment_method=PaymentMethod.sumup,
            customer_tag_uid=event_c.customer_tag.uid,
        ),
    )
    await order_service.book_topup(
        token=event_c.terminal_token,
        new_topup=NewTopUp(
            uuid=pending_topup_c.uuid,
            amount=pending_topup_c.amount,
            payment_method=PaymentMethod.sumup,
            customer_tag_uid=event_c.customer_tag.uid,
        ),
        pending=True,
    )

    amount_by_uuid = {
        pending_topup_a.uuid: pending_topup_a.amount,
        pending_ticket_b.uuid: pending_ticket_b.total_price,
        pending_topup_c.uuid: pending_topup_c.amount,
    }
    status_by_merchant = {
        "MERCHANT_A": SumUpCheckoutStatus.PAID,
        "MERCHANT_B": SumUpCheckoutStatus.FAILED,
        "MERCHANT_C": None,
    }
    seen_merchants: list[str] = []

    class MultiEventSumUpApi:
        def __init__(self, _api_key: str, merchant_code: str):
            self.merchant_code = merchant_code
            seen_merchants.append(merchant_code)

        async def find_checkout(self, order_uuid: uuid.UUID):
            status = status_by_merchant[self.merchant_code]
            if status is None:
                return None
            return SumUpCheckout(
                amount=amount_by_uuid[order_uuid],
                checkout_reference=order_uuid,
                currency="EUR",
                description="multi-event test checkout",
                id=str(uuid.uuid4()),
                merchant_code=self.merchant_code,
                status=status,
                date=datetime.now(),
                redirect_url="http://localhost/test",
            )

    # pylint: disable=protected-access
    order_service.sumup._create_sumup_api = lambda merchant_code, api_key: MultiEventSumUpApi(api_key, merchant_code)  # type: ignore

    event_a_sumup_before = await _get_system_balance(db_connection, event_node, AccountType.sumup_entry)
    event_b_sumup_before = await _get_system_balance(db_connection, event_b.node, AccountType.sumup_entry)
    event_b_sale_before = await _get_system_balance(db_connection, event_b.node, AccountType.sale_exit)
    event_c_sumup_before = await _get_system_balance(db_connection, event_c.node, AccountType.sumup_entry)

    processed_a, processed_b, processed_c = await asyncio.gather(
        order_service.check_pending_topup(token=terminal_token, order_uuid=pending_topup_a.uuid),
        order_service.check_pending_ticket_sale(token=event_b.terminal_token, order_uuid=pending_ticket_b.uuid),
        order_service.check_pending_topup(token=event_c.terminal_token, order_uuid=pending_topup_c.uuid),
    )

    assert processed_a is not None
    assert processed_a.uuid == pending_topup_a.uuid
    assert processed_b is None
    assert processed_c is None

    assert await _get_system_balance(db_connection, event_node, AccountType.sumup_entry) == pytest.approx(
        event_a_sumup_before - pending_topup_a.amount
    )
    assert await _get_system_balance(db_connection, event_b.node, AccountType.sumup_entry) == pytest.approx(
        event_b_sumup_before
    )
    assert await _get_system_balance(db_connection, event_b.node, AccountType.sale_exit) == pytest.approx(
        event_b_sale_before
    )
    assert await _get_system_balance(db_connection, event_c.node, AccountType.sumup_entry) == pytest.approx(
        event_c_sumup_before
    )

    customer_a = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_a.balance == START_BALANCE + pending_topup_a.amount

    with pytest.raises(InvalidArgument):
        await till_service.get_customer(token=event_b.terminal_token, customer_tag_uid=event_b.ticket_tag.uid)

    customer_c = await till_service.get_customer(token=event_c.terminal_token, customer_tag_uid=event_c.customer_tag.uid)
    assert customer_c.balance == START_BALANCE

    pending_order_a = await fetch_order_by_uuid(conn=db_connection, uuid=pending_topup_a.uuid)
    pending_order_b = await fetch_order_by_uuid(conn=db_connection, uuid=pending_ticket_b.uuid)
    pending_order_c = await fetch_order_by_uuid(conn=db_connection, uuid=pending_topup_c.uuid)
    assert pending_order_a.node_id == event_node.id
    assert pending_order_b.node_id == event_b.node.id
    assert pending_order_c.node_id == event_c.node.id
    assert pending_order_a.status.value == "booked"
    assert pending_order_b.status.value == "cancelled"
    assert pending_order_c.status.value == "pending"

    assert await db_connection.fetchval(
        "select count(*) from ordr where uuid = $1 and till_id = $2",
        pending_topup_a.uuid,
        pending_order_a.till_id,
    ) == 1
    assert await db_connection.fetchval(
        "select count(*) from ordr where uuid = $1 and till_id = $2",
        pending_ticket_b.uuid,
        pending_order_b.till_id,
    ) == 0
    assert await db_connection.fetchval(
        "select count(*) from ordr where uuid = $1 and till_id = $2",
        pending_topup_c.uuid,
        pending_order_c.till_id,
    ) == 0

    assert set(seen_merchants) == {"MERCHANT_A", "MERCHANT_B", "MERCHANT_C"}
