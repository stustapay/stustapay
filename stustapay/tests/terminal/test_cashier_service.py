# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,redefined-outer-name
import uuid
from dataclasses import dataclass

import pytest

from stustapay.core.schema.order import Button, NewSale, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import NewTillButton, NewTillLayout, TillButton, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.common.error import NotFound
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.till.till import TillService

from ..conftest import Cashier
from .conftest import AssignCashRegister, Customer, LoginSupervisedUser


@dataclass
class SaleProducts:
    beer_product: Product
    beer_button: TillButton


@pytest.fixture
async def sale_products(
    product_service: ProductService,
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    tax_rate_ust: TaxRate,
    till_layout: TillLayout,
) -> SaleProducts:
    beer_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Cashier Stats Helles 0,5l",
            price=3,
            fixed_price=True,
            tax_rate_id=tax_rate_ust.id,
            target_account_id=None,
            is_locked=True,
            user_tag_variant_ids=[],
            is_returnable=False,
        ),
    )
    beer_button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Cashier Stats Helles 0,5l", product_ids=[beer_product.id]),
    )
    await till_service.layout.update_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout_id=till_layout.id,
        layout=NewTillLayout(
            button_ids=[beer_button.id],
            name=till_layout.name,
            description=till_layout.description,
            ticket_ids=[],
        ),
    )
    return SaleProducts(beer_product=beer_product, beer_button=beer_button)


async def test_get_cashier_shift_stats_for_current_shift(
    cashier_service: CashierService,
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
    cashier: Cashier,
):
    await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=+2)],
            payment_method=PaymentMethod.tag,
        ),
    )

    stats = await cashier_service.get_cashier_shift_stats(
        token=event_admin_token, node_id=event_node.id, cashier_id=cashier.id
    )

    sale_orders = [order for order in stats.orders if order.order_type == OrderType.sale]
    assert len(sale_orders) == 1
    assert sale_orders[0].total_price == 6.0
    beer_stats = next(
        product_stats
        for product_stats in stats.booked_products
        if product_stats.product.id == sale_products.beer_product.id
    )
    assert beer_stats.quantity == 2


async def test_get_cashier_shift_stats_unknown_cashier(
    cashier_service: CashierService,
    event_admin_token: str,
    event_node: Node,
):
    with pytest.raises(NotFound):
        await cashier_service.get_cashier_shift_stats(token=event_admin_token, node_id=event_node.id, cashier_id=999999)


async def test_get_cashier_shift_stats_unknown_shift(
    cashier_service: CashierService,
    event_admin_token: str,
    event_node: Node,
    cashier: Cashier,
):
    with pytest.raises(NotFound):
        await cashier_service.get_cashier_shift_stats(
            token=event_admin_token, node_id=event_node.id, cashier_id=cashier.id, shift_id=999999
        )
