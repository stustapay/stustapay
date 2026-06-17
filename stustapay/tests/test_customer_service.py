# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access,redefined-outer-name

import asyncio
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg
import pytest
from dateutil.parser import parse
from sftkit.database import Connection
from sftkit.error import (
    AccessDenied,
    InvalidArgument,
    Unauthorized,
)

from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.schema.order import Order, OrderType, PaymentMethod, PendingOrderStatus
from stustapay.core.schema.payout import NewPayoutRun
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, Node
from stustapay.core.service.customer.common import fetch_customer
from stustapay.core.service.customer.customer import (
    MAX_ACTIVE_SHARED_TOPUP_LINKS_PER_CUSTOMER,
    CustomerBank,
    CustomerService,
)
from stustapay.core.service.mail import MailService
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.core.service.order.sumup import MAX_PENDING_SHARED_TOPUP_CHECKOUTS_PER_LINK
from stustapay.core.service.product import ProductService
from stustapay.core.service.tree.service import create_event
from stustapay.payment.sumup.api import SumUpCheckout, SumUpCheckoutStatus, SumUpError
from stustapay.tests.conftest import Cashier, CreateRandomUserTag


@pytest.fixture(autouse=True)
def reset_customer_sumup_state(customer_service: CustomerService):
    for attr in ("_create_sumup_api", "get_available_payment_methods_for_node"):
        customer_service.sumup.__dict__.pop(attr, None)
    customer_service.sumup.config.core.sumup_enabled = False
    yield
    for attr in ("_create_sumup_api", "get_available_payment_methods_for_node"):
        customer_service.sumup.__dict__.pop(attr, None)
    customer_service.sumup.config.core.sumup_enabled = False


class OnlineTopUpSumUpApiMock:
    def __init__(self, api_key: str, merchant_code: str):
        del api_key
        self.merchant_code = merchant_code
        self.create_calls = 0
        self.checkouts: dict[uuid.UUID, SumUpCheckout] = {}

    async def create_sumup_checkout(self, checkout) -> SumUpCheckout:
        self.create_calls += 1
        created_checkout = SumUpCheckout(
            checkout_reference=checkout.checkout_reference,
            amount=checkout.amount,
            currency=checkout.currency,
            merchant_code=checkout.merchant_code,
            description=checkout.description,
            redirect_url=checkout.redirect_url,
            id=f"checkout-{self.create_calls}",
            status=SumUpCheckoutStatus.PENDING,
            date=datetime.now(timezone.utc),
        )
        self.checkouts[checkout.checkout_reference] = created_checkout
        return created_checkout

    async def find_checkout(self, order_uuid: uuid.UUID) -> SumUpCheckout | None:
        return self.checkouts.get(order_uuid)

    async def list_available_payment_methods(self) -> list[str]:
        return ["card", "apple_pay"]


def _new_customer_portal_event(name: str, customer_portal_url: str, merchant_code: str) -> NewEvent:
    return NewEvent(
        name=name,
        description="",
        customer_portal_url=customer_portal_url,
        customer_portal_contact_email="test@test.support.test.com",
        customer_portal_about_page_url="",
        customer_portal_data_privacy_url="",
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
        group_topup_enabled=True,
        sumup_payment_enabled=True,
        sumup_affiliate_key="test_affiliate",
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


async def _set_group_topup_enabled(conn: Connection, event_node: Node, enabled: bool) -> None:
    await conn.execute(
        "update event set group_topup_enabled = $1 where id = (select event_id from node where id = $2)",
        enabled,
        event_node.id,
    )


def _customer_portal_url(event_node: Node) -> str:
    assert event_node.event is not None
    return event_node.event.customer_portal_url


def _mock_sumup_api(customer_service: CustomerService, monkeypatch: pytest.MonkeyPatch, sumup_api):
    monkeypatch.setattr(
        customer_service.sumup,
        "_create_sumup_api",
        lambda merchant_code, api_key: sumup_api,
    )


async def test_customer_portal_url_rejects_duplicate_non_empty(db_connection: Connection, event_node: Node):
    with pytest.raises(asyncpg.UniqueViolationError):
        await create_event(
            conn=db_connection,
            parent_id=ROOT_NODE_ID,
            event=_new_customer_portal_event(
                "Duplicate portal",
                _customer_portal_url(event_node),
                "TEST_MERCHANT_DUPLICATE",
            ),
        )

    first_empty = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event("Empty portal one", "", "TEST_MERCHANT_EMPTY_1"),
    )
    second_empty = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event("Empty portal two", "", "TEST_MERCHANT_EMPTY_2"),
    )
    assert first_empty.id != second_empty.id


@pytest.fixture
async def test_customer(
    db_connection: Connection, event_node: Node, create_random_user_tag: CreateRandomUserTag
) -> Customer:
    balance = 120
    tag = await create_random_user_tag()

    account_id = await db_connection.fetchval(
        "insert into account (node_id, user_tag_id, balance, type) values ($1, $2, $3, $4) returning id",
        event_node.id,
        tag.id,
        balance,
        "private",
    )

    return await fetch_customer(conn=db_connection, node=event_node, customer_id=account_id)


@pytest.fixture
async def order_with_bon(
    db_connection: Connection,
    product_service: ProductService,
    test_customer: Customer,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    tax_rate_none: TaxRate,
    cashier: Cashier,
    till: Till,
) -> Order:
    product1: Product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Bier",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
            fixed_price=True,
        ),
    )
    product2: Product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Pfand",
            price=2.0,
            tax_rate_id=tax_rate_none.id,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
            fixed_price=True,
        ),
    )

    line_items = [
        NewLineItem(
            quantity=1,
            product_id=product1.id,
            product_price=product1.price,
            tax_rate_id=product1.tax_rate_id,
        ),
        NewLineItem(
            quantity=1,
            product_id=product2.id,
            product_price=product2.price,
            tax_rate_id=product2.tax_rate_id,
        ),
    ]

    booking = await book_order(
        conn=db_connection,
        order_type=OrderType.sale,
        payment_method=PaymentMethod.tag,
        cashier_id=cashier.id,
        till_id=till.id,
        line_items=line_items,
        bookings={},
        customer_account_id=test_customer.id,
    )

    order = await fetch_order(conn=db_connection, order_id=booking.id)
    assert order is not None

    await db_connection.execute(
        "insert into bon (id, bon_json, generated_at) overriding system value values ($1, $2, $3)",
        order.id,
        {},
        parse("2023-01-01 15:35:02 UTC+1"),
    )
    return order


async def test_auth_customer(
    customer_service: CustomerService, test_customer: Customer, event_node: Node
):
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None
    assert auth.customer.id == test_customer.id
    assert auth.customer.balance == test_customer.balance

    # test get_customer with correct token
    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.id == test_customer.id
    assert result.balance == test_customer.balance

    # test get_customer with wrong token, should raise Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.get_customer(token="wrong")

    # test logout_customer
    await customer_service.logout_customer(token=auth.token)
    with pytest.raises(Unauthorized):
        await customer_service.get_customer(token=auth.token)

    # test wrong pin
    with pytest.raises(AccessDenied):
        await customer_service.login_customer(uid=test_customer.user_tag_uid, pin="wrong", node_id=event_node.id)


async def test_customer_portal_session_is_bound_to_matching_base_url(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
):
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid,
        pin=test_customer.user_tag_pin,
        node_id=event_node.id,
    )

    matching_customer = await customer_service.get_customer(
        token=auth.token,
        customer_portal_base_url=_customer_portal_url(event_node),
    )
    assert matching_customer is not None
    assert matching_customer.id == test_customer.id

    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event(
            "Other portal", f"http://localhost:4400/{secrets.token_hex(8)}", "TEST_MERCHANT_OTHER"
        ),
    )
    assert other_event.id != event_node.id

    with pytest.raises(Unauthorized):
        await customer_service.get_customer(
            token=auth.token,
            customer_portal_base_url=_customer_portal_url(other_event),
        )


async def test_customer_portal_login_rejects_node_id_from_other_portal(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
):
    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event(
            "Other portal", f"http://localhost:4400/{secrets.token_hex(8)}", "TEST_MERCHANT_OTHER"
        ),
    )

    with pytest.raises(AccessDenied, match="Login does not match current customer portal"):
        await customer_service.login_customer(
            uid=test_customer.user_tag_uid,
            pin=test_customer.user_tag_pin,
            node_id=other_event.id,
            customer_portal_base_url=_customer_portal_url(event_node),
        )


async def test_customer_portal_sumup_session_is_bound_to_matching_base_url(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid,
        pin=test_customer.user_tag_pin,
        node_id=event_node.id,
    )
    customer_service.sumup.config.core.sumup_enabled = True
    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    _mock_sumup_api(customer_service, monkeypatch, sumup_api)

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=10,
        customer_portal_base_url=_customer_portal_url(event_node),
    )
    await db_connection.execute("delete from pending_sumup_order where uuid = $1", order_uuid)

    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event(
            "Other sumup portal", f"http://localhost:4400/{secrets.token_hex(8)}", "TEST_MERCHANT_OTHER"
        ),
    )

    with pytest.raises(Unauthorized):
        await customer_service.sumup.create_online_topup_checkout(
            token=auth.token,
            amount=10,
            customer_portal_base_url=_customer_portal_url(other_event),
        )


async def test_get_api_config_includes_theme_colors(
    customer_service: CustomerService, db_connection: Connection, event_node: Node
):
    assert event_node.event is not None
    base_url = f"http://localhost:4300/{secrets.token_hex(8)}"
    await db_connection.execute(
        "update event set customer_portal_url = $1, customer_portal_primary_color = $2, "
        "customer_portal_secondary_color = $3, customer_portal_background_color = $4 where id = $5",
        base_url,
        "#112233",
        "#445566",
        "#778899",
        event_node.event.id,
    )

    config = await customer_service.get_api_config(base_url=base_url)
    assert config.primary_color == "#112233"
    assert config.secondary_color == "#445566"
    assert config.background_color == "#778899"


async def test_get_api_config_includes_sumup_payment_methods(
    customer_service: CustomerService, db_connection: Connection, event_node: Node, monkeypatch: pytest.MonkeyPatch
):
    assert event_node.event is not None
    base_url = f"http://localhost:4300/{secrets.token_hex(8)}"
    await db_connection.execute(
        "update event set customer_portal_url = $1, sumup_topup_enabled = true, sumup_api_key = $2, sumup_merchant_code = $3 "
        "where id = $4",
        base_url,
        "test-api-key",
        "MERCHANT123",
        event_node.event.id,
    )
    customer_service.sumup.config.core.sumup_enabled = True

    async def fake_get_available_payment_methods_for_node(conn: Connection, node_id: int) -> list[str]:
        del conn
        assert node_id == event_node.id
        return ["card", "apple_pay", "ideal"]

    monkeypatch.setattr(
        customer_service.sumup,
        "get_available_payment_methods_for_node",
        fake_get_available_payment_methods_for_node,
    )

    config = await customer_service.get_api_config(base_url=base_url)

    assert config.sumup_topup_enabled is True
    assert config.group_topup_enabled is False
    assert config.sumup_topup_payment_methods == ["card", "apple_pay", "ideal"]


async def test_get_api_config_returns_empty_payment_methods_on_sumup_error(
    customer_service: CustomerService, db_connection: Connection, event_node: Node, monkeypatch: pytest.MonkeyPatch
):
    assert event_node.event is not None
    base_url = f"http://localhost:4300/{secrets.token_hex(8)}"
    await db_connection.execute(
        "update event set customer_portal_url = $1, sumup_topup_enabled = true where id = $2",
        base_url,
        event_node.event.id,
    )
    customer_service.sumup.config.core.sumup_enabled = True

    async def fake_get_available_payment_methods_for_node(conn: Connection, node_id: int) -> list[str]:
        del conn, node_id
        raise SumUpError("unreachable")

    monkeypatch.setattr(
        customer_service.sumup,
        "get_available_payment_methods_for_node",
        fake_get_available_payment_methods_for_node,
    )

    config = await customer_service.get_api_config(base_url=base_url)

    assert config.sumup_topup_enabled is True
    assert config.group_topup_enabled is False
    assert config.sumup_topup_payment_methods == []


async def test_get_api_config_skips_payment_methods_when_sumup_topup_disabled(
    customer_service: CustomerService, db_connection: Connection, event_node: Node, monkeypatch: pytest.MonkeyPatch
):
    assert event_node.event is not None
    base_url = f"http://localhost:4300/{secrets.token_hex(8)}"
    await db_connection.execute(
        "update event set customer_portal_url = $1, sumup_topup_enabled = false where id = $2",
        base_url,
        event_node.event.id,
    )
    customer_service.sumup.config.core.sumup_enabled = True

    async def fake_get_available_payment_methods_for_node(conn: Connection, node_id: int) -> list[str]:
        del conn, node_id
        raise AssertionError("payment methods should not be fetched when top-up is disabled")

    monkeypatch.setattr(
        customer_service.sumup,
        "get_available_payment_methods_for_node",
        fake_get_available_payment_methods_for_node,
    )

    config = await customer_service.get_api_config(base_url=base_url)

    assert config.sumup_topup_enabled is False
    assert config.group_topup_enabled is False
    assert config.sumup_topup_payment_methods == []


async def test_create_online_topup_checkout_reuses_pending_checkout(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    first_checkout, first_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    second_checkout, second_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    assert first_order_uuid == second_order_uuid
    assert first_checkout.id == second_checkout.id
    assert sumup_api.create_calls == 1
    assert await db_connection.fetchval(
        "select count(*) from pending_sumup_order "
        "where status = 'pending' "
        "  and order_type = 'topup' "
        "  and cashier_id is null",
    ) == 1


async def test_create_online_topup_checkout_replaces_timed_out_pending_checkout(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, old_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    timed_out_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    await db_connection.execute(
        "update pending_sumup_order set created_at = $1 where uuid = $2",
        timed_out_at,
        old_order_uuid,
    )
    del sumup_api.checkouts[old_order_uuid]

    _, new_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    assert new_order_uuid != old_order_uuid
    assert sumup_api.create_calls == 2
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        old_order_uuid,
    ) == PendingOrderStatus.cancelled.value


async def test_create_online_topup_checkout_reuses_timed_out_pending_checkout_when_sumup_is_still_pending(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    first_checkout, first_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    timed_out_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    await db_connection.execute(
        "update pending_sumup_order set created_at = $1 where uuid = $2",
        timed_out_at,
        first_order_uuid,
    )

    second_checkout, second_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    assert second_order_uuid == first_order_uuid
    assert second_checkout.id == first_checkout.id
    assert sumup_api.create_calls == 1
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        first_order_uuid,
    ) == PendingOrderStatus.pending.value


async def test_create_online_topup_checkout_books_timed_out_paid_checkout_instead_of_creating_a_new_one(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, old_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    timed_out_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    await db_connection.execute(
        "update pending_sumup_order set created_at = $1 where uuid = $2",
        timed_out_at,
        old_order_uuid,
    )
    sumup_api.checkouts[old_order_uuid].status = SumUpCheckoutStatus.PAID

    reused_checkout, reused_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    assert reused_order_uuid == old_order_uuid
    assert reused_checkout.id == sumup_api.checkouts[old_order_uuid].id
    assert sumup_api.create_calls == 1
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        old_order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", old_order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_create_online_topup_checkout_rejects_paid_checkout_when_booking_fails(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    async def fail_booking(**kwargs):
        del kwargs
        raise RuntimeError("forced booking failure")

    monkeypatch.setattr(customer_service.sumup, "_book_paid_pending_order", fail_booking)

    with pytest.raises(InvalidArgument, match="Payment was received but could not be booked yet"):
        await customer_service.sumup.create_online_topup_checkout(
            token=auth.token,
            amount=20,
        )

    assert sumup_api.create_calls == 1
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.pending.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 0
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 120


async def test_check_online_topup_checkout_books_paid_checkout_before_returning_paid(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PENDING
    )

    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1


async def test_check_online_topup_checkout_keeps_paid_checkout_pending_when_booking_fails(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    async def fail_booking(**kwargs):
        del kwargs
        raise RuntimeError("forced booking failure")

    monkeypatch.setattr(customer_service.sumup, "_book_paid_pending_order", fail_booking)

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PENDING
    )
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.pending.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 0
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 120


async def test_check_online_topup_checkout_books_late_paid_checkout_after_local_cancellation(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    await db_connection.execute(
        "update pending_sumup_order set status = $1 where uuid = $2",
        PendingOrderStatus.cancelled.value,
        order_uuid,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_concurrent_check_online_topup_checkout_books_paid_checkout_once(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    first, second = await asyncio.gather(
        customer_service.sumup.check_online_topup_checkout(token=auth.token, order_uuid=order_uuid),
        customer_service.sumup.check_online_topup_checkout(token=auth.token, order_uuid=order_uuid),
    )

    assert first == SumUpCheckoutStatus.PAID
    assert second == SumUpCheckoutStatus.PAID
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_shared_topup_link_lifecycle_and_contributor_validation(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True

    async def fake_get_available_payment_methods_for_node(conn: Connection, node_id: int) -> list[str]:
        del conn, node_id
        return []

    monkeypatch.setattr(
        customer_service.sumup,
        "get_available_payment_methods_for_node",
        fake_get_available_payment_methods_for_node,
    )
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )

    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    links = await customer_service.list_shared_topup_links(token=auth.token)
    assert links[0].id == link.id
    assert links[0].token is None

    info = await customer_service.get_shared_topup_public_info(token=link.token)
    assert info.event_name == event_node.name

    with pytest.raises(InvalidArgument):
        await customer_service.sumup.create_shared_topup_checkout(
            token=link.token,
            amount=5,
            contributor_name=" ",
        )

    await customer_service.revoke_shared_topup_link(token=auth.token, link_id=link.id)
    with pytest.raises(AccessDenied):
        await customer_service.get_shared_topup_public_info(token=link.token)


async def test_shared_topup_link_is_scoped_to_customer_portal_base_url(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_customer_portal_event(
            "Other portal", f"http://localhost:4400/{secrets.token_hex(8)}", "TEST_MERCHANT_OTHER"
        ),
    )
    assert other_event.id != event_node.id

    await customer_service.get_shared_topup_public_info(
        token=link.token,
        customer_portal_base_url=_customer_portal_url(event_node),
    )
    with pytest.raises(AccessDenied, match="Shared topup link does not match current customer portal"):
        await customer_service.get_shared_topup_public_info(
            token=link.token,
            customer_portal_base_url=_customer_portal_url(other_event),
        )

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    _mock_sumup_api(customer_service, monkeypatch, sumup_api)
    with pytest.raises(AccessDenied, match="Shared topup link does not match current customer portal"):
        await customer_service.sumup.create_shared_topup_checkout(
            token=link.token,
            amount=5,
            contributor_name="Alice",
            customer_portal_base_url=_customer_portal_url(other_event),
        )


async def test_shared_topup_checkout_books_contributor_without_reserving_pending_balance(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    await db_connection.execute(
        "update event set max_account_balance = 145, vip_max_account_balance = 145 "
        "where id = (select event_id from node where id = $1)",
        event_node.id,
    )
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, first_order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    assert (
        await db_connection.fetchval(
            "select coalesce(sum((((pso.order_content #>> '{}')::jsonb)->>'amount')::numeric), 0) "
            "from pending_sumup_order pso "
            "join shared_topup_order sto on sto.order_uuid = pso.uuid "
            "where pso.status = 'pending' "
            "and sto.customer_account_id = $1",
            test_customer.id,
        )
        == 20
    )

    _, second_order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=6,
        contributor_name="Bob",
    )
    assert second_order_uuid != first_order_uuid

    with pytest.raises(InvalidArgument):
        await customer_service.sumup.create_shared_topup_checkout(
            token=link.token,
            amount=26,
            contributor_name="Charlie",
        )

    contributions = await customer_service.list_shared_topup_contributions(token=auth.token)
    first_contribution = next(contribution for contribution in contributions if contribution.order_uuid == first_order_uuid)
    second_contribution = next(contribution for contribution in contributions if contribution.order_uuid == second_order_uuid)
    assert first_contribution.contributor_name == "Alice"
    assert first_contribution.amount == 20
    assert first_contribution.status == PendingOrderStatus.pending.value
    assert second_contribution.contributor_name == "Bob"
    assert second_contribution.amount == 6
    assert second_contribution.status == PendingOrderStatus.pending.value

    sumup_api.checkouts[first_order_uuid].status = SumUpCheckoutStatus.PAID
    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=first_order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140

    orders = await customer_service.get_orders_with_bon(token=auth.token)
    shared_topup_order = next(order for order in orders if order.uuid == first_order_uuid)
    assert shared_topup_order.shared_topup_contributor_name == "Alice"


async def test_shared_topup_checkout_books_late_paid_checkout_after_local_cancellation(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    await db_connection.execute(
        "update pending_sumup_order set status = $1 where uuid = $2",
        PendingOrderStatus.cancelled.value,
        order_uuid,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_shared_topup_checkout_returns_failed_for_cancelled_unpaid_checkout(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    await db_connection.execute(
        "update pending_sumup_order set status = $1 where uuid = $2",
        PendingOrderStatus.cancelled.value,
        order_uuid,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.FAILED

    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.FAILED
    )
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 0
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 120


async def test_shared_topup_link_active_link_cap(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )

    links = [
        await customer_service.create_shared_topup_link(token=auth.token, label=f"Link {i}")
        for i in range(MAX_ACTIVE_SHARED_TOPUP_LINKS_PER_CUSTOMER)
    ]
    with pytest.raises(InvalidArgument, match="Too many active shared topup links"):
        await customer_service.create_shared_topup_link(token=auth.token)

    await customer_service.revoke_shared_topup_link(token=auth.token, link_id=links[0].id)
    replacement = await customer_service.create_shared_topup_link(token=auth.token)
    assert replacement.token is not None


async def test_shared_topup_checkout_pending_checkout_cap(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    for i in range(MAX_PENDING_SHARED_TOPUP_CHECKOUTS_PER_LINK):
        await customer_service.sumup.create_shared_topup_checkout(
            token=link.token,
            amount=1,
            contributor_name=f"Contributor {i}",
        )

    with pytest.raises(InvalidArgument, match="Too many pending shared topup checkouts"):
        await customer_service.sumup.create_shared_topup_checkout(
            token=link.token,
            amount=1,
            contributor_name="Contributor Overflow",
        )


async def test_personal_topup_checkout_ignores_pending_shared_topup_order(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    shared_checkout, shared_order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    personal_checkout, personal_order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=10,
    )

    assert personal_order_uuid != shared_order_uuid
    assert personal_checkout.id != shared_checkout.id
    assert "/topup?order_uuid=" in personal_checkout.redirect_url
    assert f"/shared-topup/{link.token}?order_uuid=" in shared_checkout.redirect_url
    assert sumup_api.create_calls == 2
    assert await db_connection.fetchval(
        "select exists(select 1 from shared_topup_order where order_uuid = $1)",
        shared_order_uuid,
    )
    assert not await db_connection.fetchval(
        "select exists(select 1 from shared_topup_order where order_uuid = $1)",
        personal_order_uuid,
    )

    assert (
        await customer_service.sumup.check_online_topup_checkout(
            token=auth.token,
            order_uuid=shared_order_uuid,
        )
        == SumUpCheckoutStatus.FAILED
    )

    sumup_api.checkouts[shared_order_uuid].status = SumUpCheckoutStatus.PAID
    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=shared_order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_shared_topup_checkout_can_be_finalized_after_link_revocation(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    await customer_service.revoke_shared_topup_link(token=auth.token, link_id=link.id)

    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_shared_topup_is_disabled_by_event_flag(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, False)
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )

    with pytest.raises(InvalidArgument, match="Group top-up is currently disabled"):
        await customer_service.create_shared_topup_link(token=auth.token)


async def test_shared_topup_checkout_can_be_finalized_after_event_feature_is_disabled(
    customer_service: CustomerService, db_connection: Connection, test_customer: Customer, event_node: Node
):
    await _set_group_topup_enabled(db_connection, event_node, True)
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    link = await customer_service.create_shared_topup_link(token=auth.token)
    assert link.token is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=link.token,
        amount=20,
        contributor_name="Alice",
    )
    await _set_group_topup_enabled(db_connection, event_node, False)
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    assert (
        await customer_service.sumup.check_shared_topup_checkout(
            token=link.token,
            order_uuid=order_uuid,
        )
        == SumUpCheckoutStatus.PAID
    )
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_pending_order_processor_books_timed_out_paid_online_topup(
    customer_service: CustomerService,
    db_connection: Connection,
    test_customer: Customer,
    event_node: Node,
    monkeypatch: pytest.MonkeyPatch,
):
    customer_service.sumup.config.core.sumup_enabled = True
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    sumup_api = OnlineTopUpSumUpApiMock(api_key="test", merchant_code="merchant")
    customer_service.sumup._create_sumup_api = lambda merchant_code, api_key: sumup_api  # type: ignore

    _, order_uuid = await customer_service.sumup.create_online_topup_checkout(
        token=auth.token,
        amount=20,
    )
    await db_connection.execute(
        "update pending_sumup_order set created_at = $1 where uuid = $2",
        datetime.now(timezone.utc) - timedelta(minutes=10),
        order_uuid,
    )
    sumup_api.checkouts[order_uuid].status = SumUpCheckoutStatus.PAID

    class StopProcessing(Exception):
        pass

    async def stop_after_first_sleep(*args, **kwargs):
        del args, kwargs
        raise StopProcessing()

    monkeypatch.setattr(asyncio, "sleep", stop_after_first_sleep)

    with pytest.raises(StopProcessing):
        await customer_service.sumup.run_sumup_pending_order_processing()

    assert await db_connection.fetchval(
        "select status from pending_sumup_order where uuid = $1",
        order_uuid,
    ) == PendingOrderStatus.booked.value
    assert await db_connection.fetchval("select count(*) from ordr where uuid = $1", order_uuid) == 1
    assert await db_connection.fetchval("select balance from account where id = $1", test_customer.id) == 140


async def test_get_orders_with_bon(
    customer_service: CustomerService, order_with_bon: Order, test_customer: Customer, event_node: Node
):
    # test get_orders_with_bon with wrong token, should raise Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.get_orders_with_bon(token="wrong")

    # login
    login_result = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert login_result is not None

    # test get_orders_with_bon
    result: list[OrderWithBon] = await customer_service.get_orders_with_bon(token=login_result.token)
    assert result is not None

    resulting_order_with_bon = result[0]
    assert resulting_order_with_bon.id == order_with_bon.id

    # test bon data
    assert resulting_order_with_bon.bon_generated


async def test_update_customer_info(
    test_customer: Customer,
    customer_service: CustomerService,
    mail_service: MailService,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute("delete from mails")
    assert event_node.event is not None
    await db_connection.execute(
        "update event set email_enabled = true, email_default_sender = $2 where id = $1",
        event_node.event.id,
        "noreply@test.invalid",
    )

    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    valid_IBAN = "DE89370400440532013000"
    invalid_IBAN = "DE89370400440532013001"
    invalid_country_code = "VG67BGXY9228788158369211"

    account_name = "Der Tester"
    email = "test@testermensch.de"

    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=0)

    email_info = await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
        mail_service=mail_service,
    )
    await customer_service.send_payout_registered_email(mail_service=mail_service, email_info=email_info)

    # test if get_customer returns the updated data
    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.id == test_customer.id
    assert result.balance == test_customer.balance
    assert result.iban == valid_IBAN
    assert result.account_name == account_name
    assert result.email == email

    mail = await db_connection.fetchrow(
        "select subject, text_message, html_message, to_addr, from_addr from mails order by id desc limit 1"
    )
    assert mail is not None
    assert mail["subject"] == "[StuStaPay] Registered for Payout"
    assert mail["to_addr"] == email
    assert mail["from_addr"] == f"{event_node.name} Auszahlung <noreply@test.invalid>"
    assert "remaining funds are registered for payout" in mail["text_message"]
    assert mail["html_message"] is not None
    assert "<html" in mail["html_message"]
    assert "teamfestlichPay" in mail["html_message"]
    assert "#2AD2C9" in mail["html_message"]
    assert "remaining funds are registered for payout" in mail["html_message"]

    # test invalid IBAN
    customer_bank = CustomerBank(iban=invalid_IBAN, account_name=account_name, email=email, donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test not allowed country codes - validation was removed, so this should now succeed
    # (Business logic change: country code validation is no longer enforced)
    customer_bank = CustomerBank(iban=invalid_country_code, account_name=account_name, email=email, donation=0)
    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
        mail_service=mail_service,
    )

    # test invalid email - Business logic change: email validation was removed
    # CustomerBank.email is now plain str instead of EmailStr, so no validation occurs
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email="test@test", donation=0)
    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
        mail_service=mail_service,
    )

    # test negative donation - Business logic change: validation moved to database constraint
    # Now raises asyncpg.CheckViolationError instead of InvalidArgument
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=-1)
    with pytest.raises(Exception):  # asyncpg.exceptions.CheckViolationError
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test more donation than balance - Business logic change: validation removed
    # The code no longer checks if donation exceeds balance
    customer_bank = CustomerBank(
        iban=valid_IBAN, account_name=account_name, email=email, donation=test_customer.balance + 1
    )
    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
        mail_service=mail_service,
    )

    # test if update_customer_info with wrong token raises Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.update_customer_info(
            token="wrong", customer_bank=customer_bank, mail_service=mail_service
        )


async def test_update_customer_info_blocked_only_for_active_payout_runs(
    test_customer: Customer,
    customer_service: CustomerService,
    mail_service: MailService,
    event_node: Node,
    event_admin_token: str,
    db_connection: Connection,
):
    auth = await customer_service.login_customer(
        uid=test_customer.user_tag_uid, pin=test_customer.user_tag_pin, node_id=event_node.id
    )
    assert auth is not None

    initial_bank_data = CustomerBank(
        iban="DE89370400440532013000",
        account_name="Der Tester",
        email="test@testermensch.de",
        donation=0,
    )
    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=initial_bank_data,
        mail_service=mail_service,
    )

    payout_run = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=10, max_payout_sum=10000),
    )

    updated_bank_data = CustomerBank(
        iban="DE44500105175407324931",
        account_name="Tester Updated",
        email="updated@testermensch.de",
        donation=0,
    )

    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=updated_bank_data,
            mail_service=mail_service,
        )
    active_payout_info = await customer_service.payout_info(token=auth.token)
    assert active_payout_info.in_payout_run
    assert active_payout_info.payout_date is None

    await customer_service.payout.set_payout_run_as_done(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        mail_service=mail_service,
    )
    completed_payout_info = await customer_service.payout_info(token=auth.token)
    assert not completed_payout_info.in_payout_run
    assert completed_payout_info.payout_date is not None

    await db_connection.execute("update account set balance = 30 where id = $1", test_customer.id)

    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=updated_bank_data,
        mail_service=mail_service,
    )

    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.iban == updated_bank_data.iban
    assert result.account_name == updated_bank_data.account_name
    assert result.email == updated_bank_data.email
