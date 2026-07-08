# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,redefined-outer-name
import uuid

import pytest
from sftkit.database import Connection

from stustapay.bon.bon import generate_dummy_bon_json
from stustapay.core.schema.order import Button, NewSale, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import NewTillButton, NewTillLayout, TillButton, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.service.common.error import NotFound
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node

from ..conftest import Cashier
from .conftest import Customer, LoginSupervisedUser


@pytest.fixture
async def sale_setup(
    product_service: ProductService,
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    tax_rate_ust: TaxRate,
    till_layout: TillLayout,
) -> tuple[Product, TillButton]:
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Order Service Bier",
            price=4.0,
            fixed_price=True,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            user_tag_variant_ids=[],
            is_returnable=False,
        ),
    )
    button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Order Service Bier", product_ids=[product.id]),
    )
    await till_service.layout.update_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout_id=till_layout.id,
        layout=NewTillLayout(
            button_ids=[button.id],
            name=till_layout.name,
            description=till_layout.description,
            ticket_ids=[],
        ),
    )
    return product, button


async def test_get_bon_by_id(
    order_service: OrderService,
    db_connection: Connection,
    event_node: Node,
    sale_setup: tuple[Product, TillButton],
    customer: Customer,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    _, button = sale_setup
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    sale_uuid = uuid.uuid4()
    completed_sale = await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=sale_uuid,
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=button.id, quantity=1)],
            payment_method=PaymentMethod.tag,
        ),
    )
    event = await fetch_restricted_event_settings_for_node(conn=db_connection, node_id=event_node.id)
    bon = await generate_dummy_bon_json(node_id=event_node.id, event=event)
    await db_connection.execute(
        "insert into bon (id, bon_json, generated_at) values ($1, $2, now())",
        completed_sale.id,
        bon.model_dump_json(),
    )

    loaded_bon = await order_service.get_bon_by_id(order_id=completed_sale.id)

    assert loaded_bon.currency_identifier == event.currency_identifier
    assert loaded_bon.order.order_type == OrderType.sale


async def test_get_bon_by_uuid(
    order_service: OrderService,
    db_connection: Connection,
    event_node: Node,
    sale_setup: tuple[Product, TillButton],
    customer: Customer,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    _, button = sale_setup
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    sale_uuid = uuid.uuid4()
    completed_sale = await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=sale_uuid,
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=button.id, quantity=1)],
            payment_method=PaymentMethod.tag,
        ),
    )
    event = await fetch_restricted_event_settings_for_node(conn=db_connection, node_id=event_node.id)
    bon = await generate_dummy_bon_json(node_id=event_node.id, event=event)
    await db_connection.execute(
        "insert into bon (id, bon_json, generated_at) values ($1, $2, now())",
        completed_sale.id,
        bon.model_dump_json(),
    )

    loaded_bon = await order_service.get_bon_by_uuid(order_uuid=str(sale_uuid))

    assert loaded_bon.currency_identifier == event.currency_identifier


async def test_get_bon_by_id_not_found(order_service: OrderService):
    with pytest.raises(NotFound):
        await order_service.get_bon_by_id(order_id=999999)


async def test_list_orders(
    order_service: OrderService,
    sale_setup: tuple[Product, TillButton],
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    _, button = sale_setup
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=button.id, quantity=1)],
            payment_method=PaymentMethod.tag,
        ),
    )

    orders = await order_service.list_orders(
        token=event_admin_token, node_id=event_node.id, customer_account_id=customer.account_id
    )

    assert len(orders) == 1
    assert orders[0].order_type == OrderType.sale


async def test_cancel_sale_admin(
    order_service: OrderService,
    sale_setup: tuple[Product, TillButton],
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    _, button = sale_setup
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    completed_sale = await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=button.id, quantity=1)],
            payment_method=PaymentMethod.tag,
        ),
    )

    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=completed_sale.id)

    orders = await order_service.list_orders(
        token=event_admin_token, node_id=event_node.id, customer_account_id=customer.account_id
    )
    cancel_orders = [order for order in orders if order.order_type == OrderType.cancel_sale]
    assert len(cancel_orders) == 1
    assert cancel_orders[0].cancels_order == completed_sale.id


async def test_show_order(
    order_service: OrderService,
    sale_setup: tuple[Product, TillButton],
    customer: Customer,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    _, button = sale_setup
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    completed_sale = await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=button.id, quantity=1)],
            payment_method=PaymentMethod.tag,
        ),
    )

    order = await order_service.show_order(token=terminal_token, order_id=completed_sale.id)

    assert order is not None
    assert order.id == completed_sale.id
