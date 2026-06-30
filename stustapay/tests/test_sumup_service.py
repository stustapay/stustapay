# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid
from datetime import datetime
from unittest.mock import patch

import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.service.sumup import SumUpService
from stustapay.payment.sumup.api import SumUpCheckout, SumUpCheckoutStatus, SumUpTransaction, SumUpTransactionStatus
from stustapay.tests.sumup_mock import MockSumUpApi


@pytest.fixture(autouse=True)
def reset_sumup_mock():
    MockSumUpApi.reset()
    yield
    MockSumUpApi.reset()


async def test_list_checkouts(
    sumup_service: SumUpService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    checkout = SumUpCheckout(
        amount=10,
        checkout_reference=uuid.uuid4(),
        currency="EUR",
        description="test checkout",
        id="checkout-1",
        merchant_code="TESTMC",
        status=SumUpCheckoutStatus.PAID,
        date=datetime.now(),
    )
    MockSumUpApi.checkouts = [checkout]
    assert event_node.event is not None
    await db_connection.execute(
        "update event set sumup_api_key = 'test-key', sumup_merchant_code = 'TESTMC' where id = $1",
        event_node.event.id,
    )

    with patch("stustapay.core.service.sumup.SumUpApi", MockSumUpApi):
        checkouts = await sumup_service.list_checkouts(token=event_admin_token, node_id=event_node.id)

    assert len(checkouts) == 1
    assert checkouts[0].id == "checkout-1"
    assert checkouts[0].amount == 10


async def test_list_transactions(
    sumup_service: SumUpService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    transaction = SumUpTransaction(
        id="transaction-1",
        amount=15,
        currency="EUR",
        payment_type="EC",
        product_summary="TopUp",
        card_type="EC",
        type="PAYMENT",
        status=SumUpTransactionStatus.SUCCESSFUL,
        timestamp=datetime.now(),
        transaction_code="abc123",
    )
    MockSumUpApi.transactions = [transaction]
    assert event_node.event is not None
    await db_connection.execute(
        "update event set sumup_api_key = 'test-key', sumup_merchant_code = 'TESTMC' where id = $1",
        event_node.event.id,
    )

    with patch("stustapay.core.service.sumup.SumUpApi", MockSumUpApi):
        transactions = await sumup_service.list_transactions(token=event_admin_token, node_id=event_node.id)

    assert len(transactions) == 1
    assert transactions[0].id == "transaction-1"
    assert transactions[0].amount == 15


async def test_get_checkout(
    sumup_service: SumUpService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    checkout = SumUpCheckout(
        amount=20,
        checkout_reference=uuid.uuid4(),
        currency="EUR",
        description="specific checkout",
        id="checkout-42",
        merchant_code="TESTMC",
        status=SumUpCheckoutStatus.PENDING,
        date=datetime.now(),
    )
    MockSumUpApi.checkouts = [checkout]
    assert event_node.event is not None
    await db_connection.execute(
        "update event set sumup_api_key = 'test-key', sumup_merchant_code = 'TESTMC' where id = $1",
        event_node.event.id,
    )

    with patch("stustapay.core.service.sumup.SumUpApi", MockSumUpApi):
        result = await sumup_service.get_checkout(
            token=event_admin_token, node_id=event_node.id, checkout_id="checkout-42"
        )

    assert result is not None
    assert result.id == "checkout-42"
    assert result.description == "specific checkout"
