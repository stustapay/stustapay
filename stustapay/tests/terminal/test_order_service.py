# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

import pytest

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import NewPayOut, NewTopUp, PaymentMethod
from stustapay.core.schema.till import NewTillProfile, Till, TillLayout
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.order import (
    NotEnoughFundsException,
    TillPermissionException,
)
from stustapay.core.service.till import TillService
from stustapay.tests.sumup_mock import MockSumUpApi

from ..conftest import Cashier
from .conftest import (
    AssertAccountBalance,
    AssertSystemAccountBalance,
    AssignCashRegister,
    Customer,
    GetAccountBalance,
    GetSystemAccountBalance,
    LoginSupervisedUser,
)

START_BALANCE = 100


async def test_topup_exceeding_max_limit_fails(
    order_service: OrderService,
    event: RestrictedEventSettings,
    terminal_token: str,
    customer: Customer,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    max_limit = event.max_account_balance
    new_topup = NewTopUp(
        uuid=uuid.uuid4(),
        amount=max_limit + 1,
        payment_method=PaymentMethod.cash,
        customer_tag_uid=customer.tag.uid,
    )
    with pytest.raises(InvalidArgument):
        await order_service.check_topup(token=terminal_token, new_topup=new_topup)


async def test_topup_sumup_order_flow(
    order_service: OrderService,
    till_service: TillService,
    terminal_token: str,
    assert_system_account_balance: AssertSystemAccountBalance,
    customer: Customer,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    new_topup = NewTopUp(
        uuid=uuid.uuid4(),
        amount=20,
        payment_method=PaymentMethod.sumup,
        customer_tag_uid=customer.tag.uid,
    )
    pending_topup = await order_service.check_topup(
        token=terminal_token,
        new_topup=new_topup,
    )
    assert pending_topup.old_balance == START_BALANCE
    assert pending_topup.amount == 20
    assert pending_topup.new_balance == START_BALANCE + pending_topup.amount
    completed_topup = await order_service.book_topup(token=terminal_token, new_topup=new_topup)
    assert completed_topup is not None
    assert completed_topup.uuid == new_topup.uuid
    assert completed_topup.old_balance == START_BALANCE
    assert completed_topup.amount == 20
    assert completed_topup.new_balance == START_BALANCE + completed_topup.amount
    await assert_system_account_balance(account_type=AccountType.sumup_entry, expected_balance=-20)
    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_info.balance == completed_topup.new_balance


async def test_topup_deferred_sumup_order_flow(
    order_service: OrderService,
    till_service: TillService,
    terminal_token: str,
    assert_system_account_balance: AssertSystemAccountBalance,
    customer: Customer,
    login_supervised_user: LoginSupervisedUser,
    cashier: Cashier,
):
    # pylint: disable=protected-access
    order_service.sumup._create_sumup_api = lambda merchant_code, api_key: MockSumUpApi(api_key, merchant_code)  # type: ignore
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    new_topup = NewTopUp(
        uuid=uuid.uuid4(),
        amount=20,
        payment_method=PaymentMethod.sumup,
        customer_tag_uid=customer.tag.uid,
    )
    pending_topup = await order_service.check_topup(
        token=terminal_token,
        new_topup=new_topup,
    )
    assert pending_topup.old_balance == START_BALANCE
    assert pending_topup.amount == 20
    assert pending_topup.new_balance == START_BALANCE + pending_topup.amount
    MockSumUpApi.mock_amount(pending_topup.amount)
    completed_topup = await order_service.book_topup(token=terminal_token, new_topup=new_topup, pending=True)
    assert completed_topup is not None
    assert completed_topup.uuid == new_topup.uuid
    assert completed_topup.old_balance == START_BALANCE
    assert completed_topup.amount == 20
    assert completed_topup.new_balance == START_BALANCE + completed_topup.amount
    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_info.balance == START_BALANCE
    completed_topup = await order_service.check_pending_topup(token=terminal_token, order_uuid=pending_topup.uuid)
    assert completed_topup is not None
    assert completed_topup.uuid == new_topup.uuid
    assert completed_topup.old_balance == START_BALANCE
    assert completed_topup.amount == 20
    assert completed_topup.new_balance == START_BALANCE + completed_topup.amount
    await assert_system_account_balance(account_type=AccountType.sumup_entry, expected_balance=-20)
    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert customer_info.balance == completed_topup.new_balance


async def test_cash_pay_out_flow_with_amount(
    order_service: OrderService,
    till_service: TillService,
    cashier: Cashier,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    customer: Customer,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
):
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    cash_drawer_start_balance = await get_account_balance(account_id=cash_register_account_id)
    cash_sale_source_start_balance = await get_system_account_balance(account_type=AccountType.cash_topup_source)
    cash_exit_start_balance = await get_system_account_balance(account_type=AccountType.cash_exit)

    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=-2 * START_BALANCE)
    with pytest.raises(NotEnoughFundsException):
        await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)

    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=-20)
    pending_pay_out = await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert pending_pay_out.old_balance == START_BALANCE
    assert pending_pay_out.new_balance == START_BALANCE - 20
    assert pending_pay_out.amount == -20

    completed_pay_out = await order_service.book_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert completed_pay_out is not None

    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert START_BALANCE - 20 == customer_info.balance
    await assert_account_balance(account_id=cash_register_account_id, expected_balance=cash_drawer_start_balance - 20)
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source, expected_balance=cash_sale_source_start_balance + 20
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_exit, expected_balance=cash_exit_start_balance + 20
    )


async def test_cash_pay_out_flow_no_amount(
    order_service: OrderService,
    till_service: TillService,
    assert_account_balance: AssertAccountBalance,
    assert_system_account_balance: AssertSystemAccountBalance,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    cashier: Cashier,
    terminal_token: str,
    customer: Customer,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
):
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    cash_drawer_start_balance = await get_account_balance(account_id=cash_register_account_id)
    cash_sale_source_start_balance = await get_system_account_balance(account_type=AccountType.cash_topup_source)
    cash_exit_start_balance = await get_system_account_balance(account_type=AccountType.cash_exit)

    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid)
    pending_pay_out = await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert pending_pay_out.old_balance == START_BALANCE
    assert pending_pay_out.new_balance == 0
    assert pending_pay_out.amount == -START_BALANCE
    completed_pay_out = await order_service.book_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert completed_pay_out is not None

    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    assert 0 == customer_info.balance
    await assert_account_balance(
        expected_balance=cash_drawer_start_balance - START_BALANCE, account_id=cash_register_account_id
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source, expected_balance=cash_sale_source_start_balance + START_BALANCE
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_exit, expected_balance=cash_exit_start_balance + START_BALANCE
    )


async def test_only_topup_till_profiles_can_topup(
    till_service: TillService,
    order_service: OrderService,
    event_admin_token: str,
    event_node: Node,
    till_layout: TillLayout,
    till: Till,
    terminal_token: str,
    customer: Customer,
    cashier: Cashier,
    login_supervised_user: LoginSupervisedUser,
):
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
        new_topup = NewTopUp(
            uuid=uuid.uuid4(),
            amount=20,
            payment_method=PaymentMethod.cash,
            customer_tag_uid=customer.tag.uid,
        )
        await order_service.check_topup(token=terminal_token, new_topup=new_topup)


async def test_topup_cash_order_flow(
    order_service: OrderService,
    cashier: Cashier,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    customer: Customer,
    terminal_token: str,
    assert_system_account_balance: AssertSystemAccountBalance,
    assert_account_balance: AssertAccountBalance,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
):
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    cash_drawer_start_balance = await get_account_balance(account_id=cash_register_account_id)
    cash_sale_source_start_balance = await get_system_account_balance(account_type=AccountType.cash_topup_source)
    cash_entry_start_balance = await get_system_account_balance(account_type=AccountType.cash_entry)

    new_topup = NewTopUp(
        uuid=uuid.uuid4(),
        amount=20,
        payment_method=PaymentMethod.cash,
        customer_tag_uid=customer.tag.uid,
    )
    pending_top_up = await order_service.check_topup(token=terminal_token, new_topup=new_topup)
    assert pending_top_up.old_balance == START_BALANCE
    assert pending_top_up.amount == 20
    assert pending_top_up.new_balance == START_BALANCE + pending_top_up.amount
    completed_topup = await order_service.book_topup(token=terminal_token, new_topup=new_topup)
    assert completed_topup is not None
    assert completed_topup.old_balance == START_BALANCE
    assert completed_topup.amount == 20
    assert completed_topup.new_balance == START_BALANCE + completed_topup.amount
    await assert_account_balance(account_id=cash_register_account_id, expected_balance=cash_drawer_start_balance + 20)
    await assert_system_account_balance(
        account_type=AccountType.cash_entry, expected_balance=cash_entry_start_balance - 20
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source, expected_balance=cash_sale_source_start_balance - 20
    )


async def test_only_payout_till_profiles_can_payout(
    order_service: OrderService,
    till_service: TillService,
    event_admin_token: str,
    till: Till,
    till_layout: TillLayout,
    customer: Customer,
    event_node: Node,
    terminal_token: str,
    cashier: Cashier,
    login_supervised_user: LoginSupervisedUser,
):
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
        new_pay_out = NewPayOut(
            uuid=uuid.uuid4(),
            customer_tag_uid=customer.tag.uid,
        )
        await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)
