# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,redefined-outer-name
import uuid
from dataclasses import dataclass

import pytest

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import Button, NewSale, OrderType, PendingSale
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import (
    NewCashRegister,
    NewCashRegisterStocking,
    NewTillButton,
    NewTillLayout,
    Till,
    TillButton,
    TillLayout,
)
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.schema.user import ADMIN_ROLE_ID, User, UserTag
from stustapay.core.service.cashier import (
    CashierService,
    CloseOut,
    InvalidCloseOutException,
)
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.order import NotEnoughVouchersException, OrderService
from stustapay.core.service.order.order import InvalidSaleException
from stustapay.core.service.product import ProductService
from stustapay.core.service.till import TillService
from stustapay.framework.database import Connection

from ..conftest import Cashier
from .conftest import (
    START_BALANCE,
    AssertAccountBalance,
    AssertSystemAccountBalance,
    AssignCashRegister,
    CreateTerminalToken,
    Customer,
    Finanzorga,
    GetSystemAccountBalance,
    LoginSupervisedUser,
)


@dataclass
class SaleProducts:
    beer_product: Product
    beer_product_full: Product
    deposit_product: Product
    beer_button: TillButton
    beer_button_full: TillButton
    deposit_button: TillButton


@pytest.fixture
async def sale_products(
    product_service: ProductService,
    till_service: TillService,
    admin_token: str,
    event_node: Node,
    tax_rate_ust: TaxRate,
    tax_rate_none: TaxRate,
    till_layout: TillLayout,
) -> SaleProducts:
    beer_product = await product_service.create_product(
        token=admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Helles 0,5l",
            price=3,
            fixed_price=True,
            tax_rate_id=tax_rate_ust.id,
            target_account_id=None,
            price_in_vouchers=1,
            is_locked=True,
            restrictions=[],
            is_returnable=False,
        ),
    )
    beer_product_full = await product_service.create_product(
        token=admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Helles 1l",
            price=5,
            fixed_price=True,
            tax_rate_id=tax_rate_ust.id,
            target_account_id=None,
            price_in_vouchers=2,
            is_locked=True,
            is_returnable=False,
            restrictions=[],
        ),
    )
    deposit_product = await product_service.create_product(
        token=admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Pfand",
            price=2,
            fixed_price=True,
            tax_rate_id=tax_rate_none.id,
            target_account_id=None,
            is_locked=True,
            is_returnable=True,
            restrictions=[],
        ),
    )
    beer_button = await till_service.layout.create_button(
        token=admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Helles 0,5l", product_ids=[beer_product.id, deposit_product.id]),
    )
    beer_button_full = await till_service.layout.create_button(
        token=admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Helles 1l", product_ids=[beer_product_full.id, deposit_product.id]),
    )
    deposit_button = await till_service.layout.create_button(
        token=admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Pfand", product_ids=[deposit_product.id]),
    )

    await till_service.layout.update_layout(
        token=admin_token,
        node_id=event_node.id,
        layout_id=till_layout.id,
        layout=NewTillLayout(
            button_ids=[deposit_button.id, beer_button.id, beer_button_full.id],
            name=till_layout.name,
            description=till_layout.description,
            ticket_ids=[],
        ),
    )

    return SaleProducts(
        beer_product=beer_product,
        beer_button=beer_button,
        beer_product_full=beer_product_full,
        beer_button_full=beer_button_full,
        deposit_product=deposit_product,
        deposit_button=deposit_button,
    )


async def test_basic_sale_flow(
    db_connection: Connection,
    till_service: TillService,
    order_service: OrderService,
    till: Till,
    customer: Customer,
    event_node: Node,
    terminal_token: str,
    admin_token: str,
    assert_system_account_balance: AssertSystemAccountBalance,
    sale_products: SaleProducts,
    cashier: Cashier,
    admin_tag: UserTag,
    login_supervised_user: LoginSupervisedUser,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    z_nr_start = await db_connection.fetchval("select z_nr from till where id = $1", till.id)
    customer_acc = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_acc is not None
    starting_balance = customer_acc.balance
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=2)],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert pending_sale.old_balance == START_BALANCE
    assert pending_sale.item_count == 2
    assert len(pending_sale.line_items) == 2
    assert pending_sale.total_price == 2 * sale_products.beer_product.price + 2 * sale_products.deposit_product.price
    assert pending_sale.new_balance == START_BALANCE - pending_sale.total_price
    completed_sale = await order_service.book_sale(token=terminal_token, new_sale=new_sale)
    assert completed_sale is not None
    order = await order_service.get_order(token=admin_token, node_id=event_node.id, order_id=completed_sale.id)
    assert order is not None
    await assert_system_account_balance(
        account_type=AccountType.sale_exit,
        expected_balance=2 * sale_products.beer_product.price + 2 * sale_products.deposit_product.price,
    )

    # test that we can cancel this order
    await order_service.cancel_sale(token=terminal_token, order_id=order.id)
    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_info is not None
    assert starting_balance == customer_info.balance
    await assert_system_account_balance(account_type=AccountType.sale_exit, expected_balance=0)

    # after logging out a user with bookings the z_nr should not be incremented
    await till_service.logout_user(token=terminal_token)
    z_nr = await db_connection.fetchval("select z_nr from till where id = $1", till.id)
    assert z_nr_start == z_nr
    # after logging in a user with bookings the z_nr should be incremented
    await till_service.login_user(token=terminal_token, user_tag=UserTag(uid=admin_tag.uid), user_role_id=ADMIN_ROLE_ID)
    z_nr = await db_connection.fetchval("select z_nr from till where id = $1", till.id)
    assert z_nr_start + 1 == z_nr


async def test_returnable_products(
    order_service: OrderService,
    customer: Customer,
    terminal_token: str,
    sale_products: SaleProducts,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=-1)],
        customer_tag_uid=customer.tag.uid,
    )
    with pytest.raises(InvalidSaleException):
        await order_service.check_sale(
            token=terminal_token,
            new_sale=new_sale,
        )

    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[Button(till_button_id=sale_products.deposit_button.id, quantity=-1)],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert pending_sale.total_price == -sale_products.deposit_product.price


async def test_basic_sale_flow_with_deposit(
    db_connection: Connection,
    order_service: OrderService,
    sale_products: SaleProducts,
    customer: Customer,
    get_system_account_balance: GetSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    # this test also checks if we can temporarily go below 0 balance due to different account bookings
    start_balance = sale_products.beer_product.price * 5.0 - sale_products.deposit_product.price / 2.0
    await db_connection.execute("update account set balance = $1 where id = $2", start_balance, customer.account_id)
    sale_exit_start_balance = await get_system_account_balance(AccountType.sale_exit)
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[
            Button(till_button_id=sale_products.beer_button.id, quantity=3),
            Button(till_button_id=sale_products.beer_button.id, quantity=2),
            Button(till_button_id=sale_products.deposit_button.id, quantity=-1),
            Button(till_button_id=sale_products.deposit_button.id, quantity=-5),
        ],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert pending_sale.old_balance == start_balance
    # our initial order gets aggregated into one line item for beer and one for deposit
    assert len(pending_sale.line_items) == 2
    assert pending_sale.total_price == 5 * sale_products.beer_product.price - sale_products.deposit_product.price
    assert pending_sale.new_balance == start_balance - pending_sale.total_price
    completed_sale = await order_service.book_sale(token=terminal_token, new_sale=new_sale)
    assert completed_sale is not None

    await assert_account_balance(account_id=customer.account_id, expected_balance=completed_sale.new_balance)
    await assert_system_account_balance(
        account_type=AccountType.sale_exit,
        expected_balance=sale_exit_start_balance
        + sale_products.beer_product.price * 5
        - sale_products.deposit_product.price,
    )


async def test_basic_sale_flow_with_only_deposit_return(
    order_service: OrderService,
    get_system_account_balance: GetSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    customer: Customer,
    terminal_token: str,
    sale_products: SaleProducts,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    sale_exit_start_balance = await get_system_account_balance(AccountType.sale_exit)
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[
            Button(till_button_id=sale_products.deposit_button.id, quantity=-1),
            Button(till_button_id=sale_products.deposit_button.id, quantity=-2),
        ],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert pending_sale.old_balance == START_BALANCE
    # our initial order gets aggregated into one line item for beer and one for deposit
    assert len(pending_sale.line_items) == 1
    assert pending_sale.total_price == -3 * sale_products.deposit_product.price
    assert pending_sale.new_balance == START_BALANCE - pending_sale.total_price
    completed_sale = await order_service.book_sale(token=terminal_token, new_sale=new_sale)
    assert completed_sale is not None
    await assert_account_balance(account_id=customer.account_id, expected_balance=completed_sale.new_balance)
    await assert_system_account_balance(
        account_type=AccountType.sale_exit,
        expected_balance=sale_exit_start_balance - 3 * sale_products.deposit_product.price,
    )


async def test_deposit_returns_cannot_exceed_account_limit(
    order_service: OrderService,
    event: RestrictedEventSettings,
    sale_products: SaleProducts,
    customer: Customer,
    terminal_token: str,
    cashier: Cashier,
    login_supervised_user: LoginSupervisedUser,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    max_limit = event.max_account_balance
    n_deposits = int(max_limit / sale_products.deposit_product.price) + 3
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[
            Button(till_button_id=sale_products.deposit_button.id, quantity=-n_deposits),
        ],
        customer_tag_uid=customer.tag.uid,
    )
    with pytest.raises(InvalidArgument):
        await order_service.check_sale(
            token=terminal_token,
            new_sale=new_sale,
        )


async def test_basic_sale_flow_with_vouchers(
    db_connection: Connection,
    customer: Customer,
    sale_products: SaleProducts,
    order_service: OrderService,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await db_connection.execute("update account set vouchers = 3 where id = $1", customer.account_id)
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[
            Button(till_button_id=sale_products.beer_button.id, quantity=3),
        ],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert pending_sale.old_balance == 100
    assert pending_sale.new_balance == 100 - sale_products.deposit_product.price * 3
    assert pending_sale.item_count == 3  # rabatt + bier + pfand
    assert len(pending_sale.line_items) == 3
    assert pending_sale.old_voucher_balance == 3
    assert pending_sale.new_voucher_balance == 0
    completed_sale = await order_service.book_sale(token=terminal_token, new_sale=new_sale)
    assert completed_sale is not None


async def test_basic_sale_flow_with_fixed_vouchers(
    db_connection: Connection,
    customer: Customer,
    sale_products: SaleProducts,
    order_service: OrderService,
    terminal_token: str,
    cashier: Cashier,
    login_supervised_user: LoginSupervisedUser,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    await db_connection.execute("update account set vouchers = 3 where id = $1", customer.account_id)
    new_sale = NewSale(
        uuid=uuid.uuid4(),
        buttons=[
            Button(till_button_id=sale_products.beer_button.id, quantity=3),
            Button(till_button_id=sale_products.beer_button_full.id, quantity=1),
        ],
        customer_tag_uid=customer.tag.uid,
    )
    pending_sale: PendingSale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )
    assert 3 == pending_sale.used_vouchers
    assert 0 == pending_sale.new_voucher_balance
    assert sale_products.beer_product_full.price + sale_products.deposit_product.price * 4 == pending_sale.total_price

    new_sale.used_vouchers = 4
    with pytest.raises(NotEnoughVouchersException):
        await order_service.check_sale(
            token=terminal_token,
            new_sale=new_sale,
        )
    new_sale.used_vouchers = 2
    pending_sale = await order_service.check_sale(
        token=terminal_token,
        new_sale=new_sale,
    )

    assert (
        sale_products.beer_product_full.price
        + sale_products.deposit_product.price * 4
        + sale_products.beer_product.price
        == pending_sale.total_price
    )
    assert 3 == pending_sale.old_voucher_balance
    assert 1 == pending_sale.new_voucher_balance
    completed_sale = await order_service.book_sale(token=terminal_token, new_sale=new_sale)
    assert completed_sale is not None


async def test_cashier_close_out(
    till_service: TillService,
    order_service: OrderService,
    cashier_service: CashierService,
    db_connection: Connection,
    event_node: Node,
    cashier: Cashier,
    admin_token: str,
    login_supervised_user: LoginSupervisedUser,
    admin_tag: UserTag,
    terminal_token: str,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    customer: Customer,
    sale_products: SaleProducts,
    admin_user: tuple[User, str],
):
    admin, _ = admin_user

    async def get_num_orders(order_type: OrderType) -> int:
        return await db_connection.fetchval(
            "select count(*) from ordr o join till t on o.till_id = t.id "
            "where order_type = $1 and t.node_id = any($2)",
            order_type.name,
            event_node.ids_to_event_node,
        )

    n_orders_start = await get_num_orders(OrderType.money_transfer)

    register = await till_service.register.create_cash_register(
        token=admin_token, node_id=event_node.id, new_register=NewCashRegister(name="Lade 25")
    )
    await login_supervised_user(user_tag_uid=admin_tag.uid, user_role_id=ADMIN_ROLE_ID)
    stocking = await till_service.register.create_cash_register_stockings(
        token=admin_token,
        node_id=event_node.id,
        stocking=NewCashRegisterStocking(name="My fancy stocking 25", euro20=2),
    )
    success = await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=stocking.id,
        cash_register_id=register.id,
    )
    assert success

    await assert_account_balance(cashier.cashier_account_id, stocking.total)
    await assert_system_account_balance(AccountType.cash_vault, -stocking.total)

    # before logging in we did not produce a money transfer order
    n_orders = await get_num_orders(OrderType.money_transfer)
    assert n_orders_start == n_orders

    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)

    # after logging in we've got a money transfer order to be signed
    n_orders = await get_num_orders(OrderType.money_transfer)
    assert n_orders_start + 1 == n_orders

    # we don't have any bookings but we simulate a close out
    # we book one order
    await order_service.book_sale(
        token=terminal_token,
        new_sale=NewSale(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
            buttons=[Button(till_button_id=sale_products.beer_button.id, quantity=1)],
        ),
    )

    cashier_info = await cashier_service.get_cashier(token=admin_token, node_id=event_node.id, cashier_id=cashier.id)
    assert cashier_info is not None
    actual_balance = 458.2
    with pytest.raises(InvalidCloseOutException):
        await cashier_service.close_out_cashier(
            token=admin_token,
            node_id=event_node.id,
            cashier_id=cashier.id,
            close_out=CloseOut(
                comment="Some comment",
                actual_cash_drawer_balance=actual_balance,
                closing_out_user_id=admin.id,
            ),
        )

    await till_service.logout_user(token=terminal_token)
    n_orders = await get_num_orders(OrderType.money_transfer)
    assert n_orders_start + 2 == n_orders

    close_out_result = await cashier_service.close_out_cashier(
        token=admin_token,
        node_id=event_node.id,
        cashier_id=cashier.id,
        close_out=CloseOut(
            comment="Some comment",
            actual_cash_drawer_balance=actual_balance,
            closing_out_user_id=admin.id,
        ),
    )
    assert close_out_result.imbalance == actual_balance - cashier_info.cash_drawer_balance

    await assert_account_balance(account_id=cashier.cashier_account_id, expected_balance=0)
    shifts = await cashier_service.get_cashier_shifts(token=admin_token, node_id=event_node.id, cashier_id=cashier.id)
    assert len(shifts) == 1
    n_orders = await get_num_orders(OrderType.money_transfer)
    assert n_orders_start + 4 == n_orders
    n_orders = await get_num_orders(OrderType.money_transfer_imbalance)
    assert 1 == n_orders
    # the sum of cash order values at all tills should be 0 as we closed out the tills
    balances = await db_connection.fetch(
        "select o.till_id, sum(li.total_price) as till_balance "
        "from line_item li "
        "join ordr o on li.order_id = o.id "
        "join till t on o.till_id = t.id "
        "where o.payment_method = 'cash' and t.node_id = any($1) "
        "group by o.till_id",
        event_node.ids_to_event_node,
    )
    assert 0 != len(balances)
    for balance in balances:
        assert (
            0 == balance["till_balance"]
        ), f"Till with id {balance['till_id']} does not have a cash balance of 0, received {balance['till_balance']}"


async def test_transport_and_cashier_account_management(
    till_service: TillService,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    cashier: Cashier,
    finanzorga: Finanzorga,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    create_terminal_token: CreateTerminalToken,
    assign_cash_register: AssignCashRegister,
):
    cashier_terminal_token = await create_terminal_token()
    await assign_cash_register(cashier=cashier)
    await login_supervised_user(
        user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id, terminal_token=cashier_terminal_token
    )
    await login_supervised_user(user_tag_uid=finanzorga.user_tag_uid, user_role_id=finanzorga.finanzorga_role.id)
    await till_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=finanzorga.user_tag_uid),
        user_role_id=finanzorga.finanzorga_role.id,
    )

    await till_service.register.modify_transport_account_balance(
        token=terminal_token, orga_tag_uid=finanzorga.user_tag_uid, amount=100
    )

    await assert_account_balance(finanzorga.transport_account_id, 100)
    await assert_system_account_balance(AccountType.cash_vault, -100)

    with pytest.raises(InvalidArgument):
        await till_service.register.modify_cashier_account_balance(
            token=terminal_token, cashier_tag_uid=cashier.user_tag_uid, amount=120
        )

    await till_service.register.modify_cashier_account_balance(
        token=terminal_token, cashier_tag_uid=cashier.user_tag_uid, amount=60
    )
    await assert_account_balance(finanzorga.transport_account_id, 40)
    await assert_account_balance(cashier.cashier_account_id, 60)
    await till_service.register.modify_cashier_account_balance(
        token=terminal_token, cashier_tag_uid=cashier.user_tag_uid, amount=-30
    )
    await assert_account_balance(finanzorga.transport_account_id, 70)
    await assert_account_balance(cashier.cashier_account_id, 30)

    with pytest.raises(InvalidArgument):
        await till_service.register.modify_transport_account_balance(
            token=terminal_token, orga_tag_uid=finanzorga.user_tag_uid, amount=-100
        )
    await till_service.register.modify_transport_account_balance(
        token=terminal_token, orga_tag_uid=finanzorga.user_tag_uid, amount=-70
    )
    await assert_account_balance(finanzorga.transport_account_id, 0)
    await assert_system_account_balance(AccountType.cash_vault, -30)
