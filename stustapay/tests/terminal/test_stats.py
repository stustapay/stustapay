# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,redefined-outer-name
import uuid
from dataclasses import dataclass

import pytest
from sftkit.database import Connection

from stustapay.core.schema.order import Button, NewFreeTicketGrant, NewPayOut, NewSale, NewTopUp, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import NewTillButton, NewTillLayout, TillButton, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import EventPrivilege, NewUserRole, NewUserToRoles, NodePrivilege
from stustapay.core.service.account import AccountService
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.stats import TimeseriesStatsQuery
from stustapay.core.service.product import ProductService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.user import UserService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag

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
    tax_rate_none: TaxRate,
    till_layout: TillLayout,
) -> SaleProducts:
    beer_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Stats Helles 0,5l",
            price=3,
            fixed_price=True,
            tax_rate_id=tax_rate_ust.id,
            target_account_id=None,
            price_in_vouchers=1,
            is_locked=True,
            user_tag_variant_ids=[],
            is_returnable=False,
        ),
    )
    deposit_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Stats Pfand",
            price=2,
            fixed_price=True,
            tax_rate_id=tax_rate_none.id,
            target_account_id=None,
            is_locked=True,
            is_returnable=True,
            user_tag_variant_ids=[],
        ),
    )
    beer_button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Stats Helles 0,5l", product_ids=[beer_product.id, deposit_product.id]),
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


async def test_product_stats_include_node_origin(
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await db_connection.execute(
        "update event set start_date = now() - interval '1 day', "
        "end_date = now() + interval '1 day', daily_end_time = '04:00:00' "
        "from node n where n.event_id = event.id and n.id = $1",
        event_node.id,
    )
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=1)],
            customer_tag_uid=customer.tag.uid,
            payment_method=PaymentMethod.tag,
        ),
    )

    stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    beer_stats = next(row for row in stats.product_overall_stats if row.product_id == sale_products.beer_product.id)
    assert beer_stats.count == 1
    assert beer_stats.node_id == event_node.id
    assert beer_stats.node_name == event_node.name


async def test_payment_method_stats(
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=1)],
            customer_tag_uid=customer.tag.uid,
            payment_method=PaymentMethod.tag,
        ),
    )

    stats = await order_service.stats.get_payment_method_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    tag_stats = next(row for row in stats.stats if row.payment_method == PaymentMethod.tag)
    assert tag_stats.count == 1
    assert tag_stats.revenue > 0


async def test_free_ticket_stats(
    user_service: UserService,
    account_service: AccountService,
    order_service: OrderService,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    cashier: Cashier,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    voucher_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="stats-free-ticket-role",
            event_privileges=[EventPrivilege.supervised_terminal_login, EventPrivilege.grant_free_tickets],
            node_privileges=[],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=cashier.id,
            role_ids=[cashier.cashier_role.id, voucher_role.id],
        ),
    )
    await login_supervised_user(cashier.user_tag_uid, voucher_role.id)

    volunteer_tag = await create_random_user_tag()
    await account_service.grant_free_tickets(
        token=terminal_token,
        new_free_ticket_grant=NewFreeTicketGrant(
            user_tag_uid=volunteer_tag.uid,
            user_tag_pin=volunteer_tag.pin,
            initial_voucher_amount=0,
        ),
    )

    stats = await order_service.stats.get_free_ticket_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )
    assert stats.free_tickets_issued == 1


async def test_product_stats_include_vouchers_redeemed(
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await db_connection.execute(
        "update event set start_date = now() - interval '1 day', "
        "end_date = now() + interval '1 day', daily_end_time = '04:00:00' "
        "from node n where n.event_id = event.id and n.id = $1",
        event_node.id,
    )
    await db_connection.execute("update account set vouchers = 2 where id = $1", customer.account_id)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=2)],
            customer_tag_uid=customer.tag.uid,
            payment_method=PaymentMethod.tag,
            used_vouchers=2,
        ),
    )

    stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    beer_stats = next(row for row in stats.product_overall_stats if row.product_id == sale_products.beer_product.id)
    assert beer_stats.vouchers_redeemed == 2

    vouchers_redeemed = await db_connection.fetchval(
        "select sum(li.vouchers_redeemed) from line_item li join product p on li.product_id = p.id where p.id = $1",
        sale_products.beer_product.id,
    )
    assert vouchers_redeemed == 2


async def _set_event_stats_window(db_connection: Connection, event_node: Node):
    await db_connection.execute(
        "update event set start_date = now() - interval '1 day', "
        "end_date = now() + interval '1 day', daily_end_time = '04:00:00' "
        "from node n where n.event_id = event.id and n.id = $1",
        event_node.id,
    )


async def test_entry_stats(
    order_service: OrderService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await _set_event_stats_window(db_connection, event_node)

    stats = await order_service.stats.get_entry_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    assert stats.from_time is not None
    assert stats.to_time is not None


async def test_top_up_stats(
    order_service: OrderService,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
    cashier: Cashier,
):
    await _set_event_stats_window(db_connection, event_node)
    await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_topup(
        token=terminal_token,
        new_topup=NewTopUp(
            uuid=uuid.uuid4(),
            amount=15,
            payment_method=PaymentMethod.cash,
            customer_tag_uid=customer.tag.uid,
        ),
    )

    stats = await order_service.stats.get_top_up_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    assert sum(interval.count for interval in stats.hourly_intervals) >= 1


async def test_pay_out_stats(
    order_service: OrderService,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
    cashier: Cashier,
):
    await _set_event_stats_window(db_connection, event_node)
    await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=-10)
    await order_service.check_pay_out(token=terminal_token, new_pay_out=pay_out)
    await order_service.book_pay_out(token=terminal_token, new_pay_out=pay_out)

    stats = await order_service.stats.get_pay_out_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    assert sum(interval.count for interval in stats.hourly_intervals) >= 1


async def test_voucher_stats(
    user_service: UserService,
    account_service: AccountService,
    order_service: OrderService,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
    customer: Customer,
):
    await _set_event_stats_window(db_connection, event_node)
    voucher_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="stats-voucher-role",
            event_privileges=[EventPrivilege.supervised_terminal_login, EventPrivilege.grant_vouchers],
            node_privileges=[],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=cashier.id,
            role_ids=[cashier.cashier_role.id, voucher_role.id],
        ),
    )
    await login_supervised_user(cashier.user_tag_uid, voucher_role.id)
    await account_service.grant_vouchers(
        token=terminal_token,
        user_tag_uid=customer.tag.uid,
        vouchers=3,
    )

    stats = await order_service.stats.get_voucher_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    assert stats.vouchers_issued >= 3


async def test_revenue_stats(
    user_service: UserService,
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await _set_event_stats_window(db_connection, event_node)
    await user_service.update_user_role_privileges(
        token=event_admin_token,
        node_id=event_node.id,
        role_id=cashier.cashier_role.id,
        can_assign_all_roles=False,
        assignable_role_ids=[],
        event_privileges=[EventPrivilege.supervised_terminal_login],
        node_privileges=[NodePrivilege.can_book_orders, NodePrivilege.view_node_stats],
    )
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=1)],
            customer_tag_uid=customer.tag.uid,
            payment_method=PaymentMethod.tag,
        ),
    )

    stats = await order_service.stats.get_revenue_stats(
        token=terminal_token,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )

    assert sum(interval.revenue for interval in stats.hourly_intervals) > 0
