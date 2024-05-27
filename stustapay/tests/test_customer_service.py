# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access,redefined-outer-name

import pytest
from dateutil.parser import parse

from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.schema.order import Order, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node
from stustapay.core.service.common.error import (
    AccessDenied,
    InvalidArgument,
    Unauthorized,
)
from stustapay.core.service.customer.common import fetch_customer
from stustapay.core.service.customer.customer import CustomerBank, CustomerService
from stustapay.core.service.mail import MailService
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.core.service.product import ProductService
from stustapay.framework.database import Connection
from stustapay.tests.conftest import Cashier, CreateRandomUserTag


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
        "insert into bon (id, generated, generated_at, mime_type, content) overriding system value "
        "values ($1, $2, $3, $4, $5)",
        order.id,
        True,
        parse("2023-01-01 15:35:02 UTC+1"),
        "application/pdf",
        b"asdf1234",  # this is obviously not a valid pdf but that's fine for a test
    )
    return order


async def test_auth_customer(customer_service: CustomerService, test_customer: Customer):
    auth = await customer_service.login_customer(pin=test_customer.user_tag_pin)
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
        await customer_service.login_customer(pin="wrong")


async def test_get_orders_with_bon(customer_service: CustomerService, order_with_bon: Order, test_customer: Customer):
    # test get_orders_with_bon with wrong token, should raise Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.get_orders_with_bon(token="wrong")

    # login
    login_result = await customer_service.login_customer(pin=test_customer.user_tag_pin)
    assert login_result is not None

    # test get_orders_with_bon
    result: list[OrderWithBon] = await customer_service.get_orders_with_bon(token=login_result.token)
    assert result is not None

    resulting_order_with_bon = result[0]
    assert resulting_order_with_bon.id == order_with_bon.id

    # test bon data
    assert resulting_order_with_bon.bon_generated


async def test_update_customer_info(
    test_customer: Customer, customer_service: CustomerService, mail_service: MailService
):
    auth = await customer_service.login_customer(pin=test_customer.user_tag_pin)
    assert auth is not None

    valid_IBAN = "DE89370400440532013000"
    invalid_IBAN = "DE89370400440532013001"
    invalid_country_code = "VG67BGXY9228788158369211"

    account_name = "Der Tester"
    email = "test@testermensch.de"

    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=0)

    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
        mail_service=mail_service,
    )

    # test if get_customer returns the updated data
    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.id == test_customer.id
    assert result.balance == test_customer.balance
    assert result.iban == valid_IBAN
    assert result.account_name == account_name
    assert result.email == email

    # test invalid IBAN
    customer_bank = CustomerBank(iban=invalid_IBAN, account_name=account_name, email=email, donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test not allowed country codes
    customer_bank = CustomerBank(iban=invalid_country_code, account_name=account_name, email=email, donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test invalid email
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email="test@test", donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test negative donation
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=-1)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
            mail_service=mail_service,
        )

    # test more donation than balance
    customer_bank = CustomerBank(
        iban=valid_IBAN, account_name=account_name, email=email, donation=test_customer.balance + 1
    )
    with pytest.raises(InvalidArgument):
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
