# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

import pytest
from sftkit.error import InvalidArgument

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import NewPayOut
from stustapay.core.schema.till import NewTillProfile, Till, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.order import (
    TillPermissionException,
)
from stustapay.core.service.till.till import TillService

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

    # Test that payout validation works for amounts exceeding balance
    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=2 * START_BALANCE)
    with pytest.raises(InvalidArgument):
        await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)

    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=-20)
    pending_pay_out = await order_service.check_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert pending_pay_out.old_balance == START_BALANCE
    assert pending_pay_out.new_balance == START_BALANCE - 20
    # Amount is stored as absolute value for normal payouts
    assert pending_pay_out.amount == 20

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
    # Amount is stored as absolute value for normal payouts
    assert pending_pay_out.amount == START_BALANCE
    completed_pay_out = await order_service.book_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert completed_pay_out is not None

    customer_info = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    # Customer balance should be 0 after full payout
    assert 0 == customer_info.balance
    # Cash register loses money (pays out to customer)
    await assert_account_balance(
        expected_balance=cash_drawer_start_balance - START_BALANCE, account_id=cash_register_account_id
    )
    # System accounts track the money flow
    await assert_system_account_balance(
        account_type=AccountType.cash_topup_source, expected_balance=cash_sale_source_start_balance + START_BALANCE
    )
    await assert_system_account_balance(
        account_type=AccountType.cash_exit, expected_balance=cash_exit_start_balance + START_BALANCE
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
            allow_ticket_vouchers=False,
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


async def test_payout_money_conservation(
    order_service: OrderService,
    till_service: TillService,
    get_account_balance: GetAccountBalance,
    get_system_account_balance: GetSystemAccountBalance,
    cashier: Cashier,
    terminal_token: str,
    customer: Customer,
    login_supervised_user: LoginSupervisedUser,
    assign_cash_register: AssignCashRegister,
):
    """
    Test that verifies money conservation during payouts.
    This comprehensive test ensures no money is created or destroyed during payout operations.
    """
    cash_register_account_id = await assign_cash_register(cashier=cashier)
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)

    # Record ALL relevant account balances BEFORE payout
    balances_before = {}

    # Customer account
    customer_before = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    balances_before["customer"] = customer_before.balance

    # Cash register account
    balances_before["cash_register"] = await get_account_balance(account_id=cash_register_account_id)

    # All system accounts that could be affected
    for account_type in [
        AccountType.cash_topup_source,
        AccountType.cash_exit,
        AccountType.cash_entry,
        AccountType.sale_exit,
        AccountType.cash_vault,
        AccountType.cash_imbalance,
    ]:
        balances_before[account_type.name] = await get_system_account_balance(account_type=account_type)

    # Calculate total money in system before payout
    total_money_before = (
        balances_before["customer"] +
        balances_before["cash_register"] +
        sum(balances_before[acc_type] for acc_type in [
            AccountType.cash_topup_source.name,
            AccountType.cash_exit.name,
            AccountType.cash_entry.name,
            AccountType.sale_exit.name,
            AccountType.cash_vault.name,
            AccountType.cash_imbalance.name,
        ])
    )

    # Perform payout (partial payout to keep it simple)
    payout_amount = 25.0
    new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=customer.tag.uid, amount=payout_amount)
    completed_pay_out = await order_service.book_pay_out(token=terminal_token, new_pay_out=new_pay_out)
    assert completed_pay_out is not None
    assert completed_pay_out.amount == payout_amount

    # Record ALL relevant account balances AFTER payout
    balances_after = {}

    # Customer account
    customer_after = await till_service.get_customer(token=terminal_token, customer_tag_uid=customer.tag.uid)
    balances_after["customer"] = customer_after.balance

    # Cash register account
    balances_after["cash_register"] = await get_account_balance(account_id=cash_register_account_id)

    # All system accounts that could be affected
    for account_type in [
        AccountType.cash_topup_source,
        AccountType.cash_exit,
        AccountType.cash_entry,
        AccountType.sale_exit,
        AccountType.cash_vault,
        AccountType.cash_imbalance,
    ]:
        balances_after[account_type.name] = await get_system_account_balance(account_type=account_type)

    # Calculate total money in system after payout
    total_money_after = (
        balances_after["customer"] +
        balances_after["cash_register"] +
        sum(balances_after[acc_type] for acc_type in [
            AccountType.cash_topup_source.name,
            AccountType.cash_exit.name,
            AccountType.cash_entry.name,
            AccountType.sale_exit.name,
            AccountType.cash_vault.name,
            AccountType.cash_imbalance.name,
        ])
    )

    # MONEY CONSERVATION LAW: Total money in system must remain the same
    assert total_money_before == total_money_after, (
        f"Money conservation violated! Before: {total_money_before:.2f}€, After: {total_money_after:.2f}€"
    )

    # Verify each account changed by the expected amount
    expected_changes = {
        "customer": -payout_amount,  # Customer loses money
        "cash_register": -payout_amount,  # Cash register loses money (pays out)
        AccountType.cash_topup_source.name: +payout_amount,  # System tracks money leaving customer
        AccountType.cash_exit.name: +payout_amount,  # System tracks cash leaving register
        # Other accounts should remain unchanged
        AccountType.cash_entry.name: 0,
        AccountType.sale_exit.name: 0,
        AccountType.cash_vault.name: 0,
        AccountType.cash_imbalance.name: 0,
    }

    for account_name, expected_change in expected_changes.items():
        actual_change = balances_after[account_name] - balances_before[account_name]
        assert actual_change == expected_change, (
            f"Account '{account_name}' changed by {actual_change:.2f}€, expected {expected_change:.2f}€"
        )

    # Final verification of customer balance
    assert customer_after.balance == START_BALANCE - payout_amount


