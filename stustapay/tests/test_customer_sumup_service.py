# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,protected-access,redefined-outer-name
from unittest.mock import patch

import pytest
from sftkit.database import Connection

from stustapay.core.schema.customer import Customer
from stustapay.core.schema.tree import Node
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.customer.common import fetch_customer
from stustapay.core.service.customer.customer import CustomerService
from stustapay.payment.sumup.api import SumUpCheckoutStatus
from stustapay.tests.conftest import CreateRandomUserTag
from stustapay.tests.sumup_mock import MockSumUpApi


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


@pytest.fixture(autouse=True)
def reset_sumup_mock():
    MockSumUpApi.reset()
    yield
    MockSumUpApi.reset()


@pytest.fixture
async def enable_online_sumup(
    db_connection: Connection, event_node: Node, customer_service: CustomerService, monkeypatch: pytest.MonkeyPatch
):
    assert event_node.event is not None
    await db_connection.execute(
        "update event set sumup_topup_enabled = true, sumup_api_key = 'test-key', sumup_merchant_code = 'TESTMC' "
        "where id = $1",
        event_node.event.id,
    )
    monkeypatch.setattr(customer_service.config.core, "sumup_enabled", True)


async def test_create_online_topup_checkout(
    customer_service: CustomerService,
    test_customer,
    event_node: Node,
    enable_online_sumup,
):
    del enable_online_sumup
    with patch("stustapay.core.service.order.sumup.SumUpApi", MockSumUpApi):
        login = await customer_service.login_customer(pin=test_customer.user_tag_pin, node_id=event_node.id)
        checkout, order_uuid = await customer_service.sumup.create_online_topup_checkout(token=login.token, amount=20)

    assert checkout.amount == 20
    assert checkout.status == SumUpCheckoutStatus.PENDING
    assert order_uuid is not None


async def test_create_online_topup_checkout_rejects_cent_amounts(
    customer_service: CustomerService,
    test_customer,
    event_node: Node,
    enable_online_sumup,
):
    del enable_online_sumup
    with patch("stustapay.core.service.order.sumup.SumUpApi", MockSumUpApi):
        login = await customer_service.login_customer(pin=test_customer.user_tag_pin, node_id=event_node.id)
        with pytest.raises(InvalidArgument):
            await customer_service.sumup.create_online_topup_checkout(token=login.token, amount=10.5)


async def test_check_online_topup_checkout_for_booked_order(
    customer_service: CustomerService,
    test_customer,
    event_node: Node,
    enable_online_sumup,
):
    del enable_online_sumup
    with patch("stustapay.core.service.order.sumup.SumUpApi", MockSumUpApi):
        login = await customer_service.login_customer(pin=test_customer.user_tag_pin, node_id=event_node.id)
        _, order_uuid = await customer_service.sumup.create_online_topup_checkout(token=login.token, amount=20)
        MockSumUpApi.mock_amount(20)
        status = await customer_service.sumup.check_online_topup_checkout(token=login.token, order_uuid=order_uuid)

    assert status == SumUpCheckoutStatus.PAID
