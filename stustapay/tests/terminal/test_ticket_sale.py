# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,redefined-outer-name
import uuid
from dataclasses import dataclass

import pytest
from sftkit.error import InvalidArgument

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import (
    CompletedTicketSale,
    NewTicketSale,
    NewTicketScan,
    PaymentMethod,
    UserTagScan,
)
from stustapay.core.schema.product import ProductRestriction
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.ticket import NewTicket, Ticket
from stustapay.core.schema.till import NewTillLayout, NewTillProfile, Till, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.service.order.order import OrderService, TillPermissionException
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.sumup_mock import MockSumUpApi
from stustapay.tests.terminal.conftest import (
    AssertAccountBalance,
    AssertSystemAccountBalance,
    AssignCashRegister,
    Customer,
    GetAccountBalance,
    GetSystemAccountBalance,
    LoginSupervisedUser,
)


@dataclass
class SaleTickets:
    ticket: Ticket
    ticket_u18: Ticket
    ticket_u16: Ticket


@pytest.fixture
async def sale_tickets(
    ticket_service: TicketService,
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    tax_rate_none: TaxRate,
    till_layout: TillLayout,
) -> SaleTickets:
    ticket = await ticket_service.create_ticket(
        token=event_admin_token,
        node_id=event_node.id,
        ticket=NewTicket(
            name="Eintritt mit 8€",
            price=12,
            tax_rate_id=tax_rate_none.id,
            initial_top_up_amount=8,
            restrictions=[],
            is_locked=True,
        ),
    )
    ticket_u18 = await ticket_service.create_ticket(
        token=event_admin_token,
        node_id=event_node.id,
        ticket=NewTicket(
            name="Eintritt U18",
            price=12,
            tax_rate_id=tax_rate_none.id,
            initial_top_up_amount=8,
            is_locked=True,
            restrictions=[ProductRestriction.under_18],
        ),
    )
    ticket_u16 = await ticket_service.create_ticket(
        token=event_admin_token,
        node_id=event_node.id,
        ticket=NewTicket(
            name="Eintritt U16",
            price=12,
            tax_rate_id=tax_rate_none.id,
            initial_top_up_amount=0,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
    )
    await till_service.layout.update_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout_id=till_layout.id,
        layout=NewTillLayout(
            button_ids=[],
            name=till_layout.name,
            description=till_layout.description,
            ticket_ids=[ticket.id, ticket_u16.id, ticket_u18.id],
        ),
    )
    return SaleTickets(
        ticket=ticket,
        ticket_u16=ticket_u16,
        ticket_u18=ticket_u18,
    )


async def test_only_ticket_till_profiles_can_sell_tickets(
    order_service: OrderService,
    till_service: TillService,
    event_admin_token: str,
    till_layout: TillLayout,
    till: Till,
    customer: Customer,
    terminal_token: str,
    cashier: Cashier,
    event_node: Node,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
):
    await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    profile = await till_service.profile.create_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile=NewTillProfile(
            name="profile2",
            description="",
            layout_id=till_layout.id,
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
            enable_ssp_payment=True,
            enable_cash_payment=False,
            enable_card_payment=False,
        ),
    )
    till.active_profile_id = profile.id
    await till_service.update_till(token=event_admin_token, node_id=event_node.id, till_id=till.id, till=till)

    with pytest.raises(TillPermissionException):
        new_ticket_sale = NewTicketSale(
            uuid=uuid.uuid4(),
            customer_tags=[UserTagScan(tag_uid=customer.tag.uid, tag_pin=customer.tag.pin)],
            payment_method=PaymentMethod.cash,
        )
        await order_service.check_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket_sale)


async def test_ticket_flow_with_one_tag(
    order_service: OrderService,
    till_service: TillService,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    cashier: Cashier,
    terminal_token: str,
    sale_tickets: SaleTickets,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
    create_random_user_tag: CreateRandomUserTag,
):
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    cash_drawer_start_balance = await get_account_balance(account_id=cash_register_account_id)
    cash_sale_source_start_balance = await get_system_account_balance(account_type=AccountType.cash_topup_source)
    cash_entry_start_balance = await get_system_account_balance(account_type=AccountType.cash_entry)
    sale_exit_start_balance = await get_system_account_balance(account_type=AccountType.cash_exit)

    unused_tag = await create_random_user_tag()

    new_scan = NewTicketScan(customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)])
    scan_result = await order_service.check_ticket_scan(token=terminal_token, new_ticket_scan=new_scan)
    assert scan_result is not None

    new_ticket = NewTicketSale(
        uuid=uuid.uuid4(),
        customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)],
        payment_method=PaymentMethod.cash,
    )
    pending_ticket = await order_service.check_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert 2 == pending_ticket.item_count
    assert sale_tickets.ticket.total_price == pending_ticket.total_price
    completed_ticket = await order_service.book_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert completed_ticket is not None

    customer = await till_service.get_customer(token=terminal_token, customer_tag_uid=unused_tag.uid)
    assert sale_tickets.ticket.initial_top_up_amount == customer.balance
    await assert_account_balance(
        account_id=cash_register_account_id,
        expected_balance=cash_drawer_start_balance + completed_ticket.total_price,
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_entry,
        expected_balance=cash_entry_start_balance - completed_ticket.total_price,
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source,
        expected_balance=cash_sale_source_start_balance + -completed_ticket.total_price,
    )
    await assert_system_account_balance(
        account_type=AccountType.sale_exit, expected_balance=sale_exit_start_balance + sale_tickets.ticket.price
    )


async def test_ticket_flow_with_initial_topup_sumup(
    order_service: OrderService,
    till_service: TillService,
    get_system_account_balance: GetSystemAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    terminal_token: str,
    sale_tickets: SaleTickets,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
    create_random_user_tag: CreateRandomUserTag,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    sumup_start_balance = await get_system_account_balance(account_type=AccountType.sumup_entry)
    sale_exit_start_balance = await get_system_account_balance(account_type=AccountType.sale_exit)
    unused_tag = await create_random_user_tag()

    new_scan = NewTicketScan(customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)])
    scan_result = await order_service.check_ticket_scan(token=terminal_token, new_ticket_scan=new_scan)
    assert scan_result is not None

    new_ticket = NewTicketSale(
        uuid=uuid.uuid4(),
        customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)],
        payment_method=PaymentMethod.sumup,
    )
    pending_ticket = await order_service.check_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert 2 == pending_ticket.item_count
    assert sale_tickets.ticket.total_price == pending_ticket.total_price
    completed_ticket = await order_service.book_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert completed_ticket is not None

    customer = await till_service.get_customer(token=terminal_token, customer_tag_uid=unused_tag.uid)
    assert sale_tickets.ticket.initial_top_up_amount == customer.balance
    await assert_system_account_balance(
        account_type=AccountType.sumup_entry, expected_balance=sumup_start_balance - completed_ticket.total_price
    )
    await assert_system_account_balance(
        account_type=AccountType.sale_exit, expected_balance=sale_exit_start_balance + sale_tickets.ticket.price
    )


async def test_ticket_flow_with_deferred_sumup_payment(
    order_service: OrderService,
    till_service: TillService,
    get_system_account_balance: GetSystemAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    terminal_token: str,
    sale_tickets: SaleTickets,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
    create_random_user_tag: CreateRandomUserTag,
):
    # pylint: disable=protected-access
    order_service.sumup._create_sumup_api = lambda merchant_code, api_key: MockSumUpApi(api_key, merchant_code)  # type: ignore
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    sumup_start_balance = await get_system_account_balance(account_type=AccountType.sumup_entry)
    sale_exit_start_balance = await get_system_account_balance(account_type=AccountType.sale_exit)
    unused_tag = await create_random_user_tag()

    new_scan = NewTicketScan(customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)])
    scan_result = await order_service.check_ticket_scan(token=terminal_token, new_ticket_scan=new_scan)
    assert scan_result is not None

    new_ticket = NewTicketSale(
        uuid=uuid.uuid4(),
        customer_tags=[UserTagScan(tag_uid=unused_tag.uid, tag_pin=unused_tag.pin)],
        payment_method=PaymentMethod.sumup,
    )
    pending_ticket = await order_service.check_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert 2 == pending_ticket.item_count
    assert sale_tickets.ticket.total_price == pending_ticket.total_price
    MockSumUpApi.mock_amount(pending_ticket.total_price)
    completed_ticket = await order_service.book_ticket_sale(
        token=terminal_token, new_ticket_sale=new_ticket, pending=True
    )
    assert completed_ticket is not None

    with pytest.raises(InvalidArgument):
        await till_service.get_customer(token=terminal_token, customer_tag_uid=unused_tag.uid)

    completed_ticket = await order_service.check_pending_ticket_sale(
        token=terminal_token,
        order_uuid=new_ticket.uuid,
    )
    assert completed_ticket.uuid == new_ticket.uuid
    customer = await till_service.get_customer(token=terminal_token, customer_tag_uid=unused_tag.uid)
    assert sale_tickets.ticket.initial_top_up_amount == customer.balance
    await assert_system_account_balance(
        account_type=AccountType.sumup_entry, expected_balance=sumup_start_balance - completed_ticket.total_price
    )
    await assert_system_account_balance(
        account_type=AccountType.sale_exit, expected_balance=sale_exit_start_balance + sale_tickets.ticket.price
    )


async def test_ticket_flow_with_multiple_tags_invalid_booking(
    order_service: OrderService,
    till_service: TillService,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    cashier: Cashier,
    terminal_token: str,
    sale_tickets: SaleTickets,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
    create_random_user_tag: CreateRandomUserTag,
):
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    cash_drawer_start_balance = await get_account_balance(account_id=cash_register_account_id)
    cash_sale_source_start_balance = await get_system_account_balance(account_type=AccountType.cash_topup_source)
    cash_entry_start_balance = await get_system_account_balance(account_type=AccountType.cash_entry)
    sale_exit_start_balance = await get_system_account_balance(account_type=AccountType.sale_exit)

    tag = await create_random_user_tag()
    tag2 = await create_random_user_tag()
    u18_tag = await create_random_user_tag(
        restriction=ProductRestriction.under_18,
    )
    u16_tag = await create_random_user_tag(
        restriction=ProductRestriction.under_16,
    )

    new_ticket = NewTicketSale(
        uuid=uuid.uuid4(),
        customer_tags=[
            UserTagScan(tag_uid=tag.uid, tag_pin=tag.pin),
            UserTagScan(tag_uid=tag2.uid, tag_pin=tag2.pin),
            UserTagScan(tag_uid=u16_tag.uid, tag_pin=u16_tag.pin),
            UserTagScan(tag_uid=u18_tag.uid, tag_pin=u18_tag.pin),
        ],
        payment_method=PaymentMethod.cash,
    )
    pending_ticket = await order_service.check_ticket_sale(token=terminal_token, new_ticket_sale=new_ticket)
    assert 4 == pending_ticket.item_count
    assert 4 == len(pending_ticket.scanned_tickets)
    assert (
        2 * sale_tickets.ticket.total_price + sale_tickets.ticket_u18.total_price + sale_tickets.ticket_u16.total_price
        == pending_ticket.total_price
    )
    completed_ticket: CompletedTicketSale = await order_service.book_ticket_sale(
        token=terminal_token, new_ticket_sale=new_ticket
    )
    assert completed_ticket is not None
    await assert_account_balance(
        account_id=cash_register_account_id,
        expected_balance=cash_drawer_start_balance + completed_ticket.total_price,
    )
    expected_line_items = {
        sale_tickets.ticket.id: 2,
        sale_tickets.ticket_u18.id: 1,
        sale_tickets.ticket_u16.id: 1,
    }
    for product_id, quantity in expected_line_items.items():
        items = [line_item for line_item in completed_ticket.line_items if line_item.product.id == product_id]
        assert 1 == len(items)
        assert quantity == items[0].quantity

    assert (
        sale_tickets.ticket.initial_top_up_amount
        == (await till_service.get_customer(token=terminal_token, customer_tag_uid=tag.uid)).balance
    )
    assert (
        sale_tickets.ticket.initial_top_up_amount
        == (await till_service.get_customer(token=terminal_token, customer_tag_uid=tag2.uid)).balance
    )
    assert (
        sale_tickets.ticket_u18.initial_top_up_amount
        == (await till_service.get_customer(token=terminal_token, customer_tag_uid=u18_tag.uid)).balance
    )
    assert (
        sale_tickets.ticket_u16.initial_top_up_amount
        == (await till_service.get_customer(token=terminal_token, customer_tag_uid=u16_tag.uid)).balance
    )

    await assert_system_account_balance(
        account_type=AccountType.cash_entry,
        expected_balance=cash_entry_start_balance - completed_ticket.total_price,
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source,
        expected_balance=cash_sale_source_start_balance - completed_ticket.total_price,
    )
    await assert_system_account_balance(
        account_type=AccountType.sale_exit,
        expected_balance=sale_exit_start_balance
        + 2 * sale_tickets.ticket.price
        + sale_tickets.ticket_u18.price
        + sale_tickets.ticket_u16.price,
    )
