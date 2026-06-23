# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.till import NewTillProfile, Till, TillLayout
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import EventPrivilege, NewUserRole, NewUserToRoles
from stustapay.core.service.account import AccountService
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.till.till import TillService
from stustapay.core.service.user import UserService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag

from .conftest import LoginSupervisedUser


async def test_free_ticket_grant_with_vouchers(
    user_service: UserService,
    till_service: TillService,
    account_service: AccountService,
    terminal_token: str,
    event_admin_token: str,
    cashier: Cashier,
    event_node: Node,
    till: Till,
    till_layout: TillLayout,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    voucher_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="test-role",
            event_privileges=[EventPrivilege.supervised_terminal_login, EventPrivilege.grant_free_tickets],
            node_privileges=[],
        ),
    )
    await till_service.profile.update_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile_id=till.active_profile_id,
        profile=NewTillProfile(
            name="test-profile",
            description="",
            layout_id=till_layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=True,
            enable_ssp_payment=True,
            enable_cash_payment=False,
            enable_card_payment=False,
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
    # after updating the cashier roles we need to log out and log in with the new role
    await login_supervised_user(cashier.user_tag_uid, voucher_role.id)

    volunteer_tag = await create_random_user_tag()
    grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag.uid, user_tag_pin=volunteer_tag.pin, initial_voucher_amount=3)
    success = await account_service.grant_free_tickets(token=terminal_token, new_free_ticket_grant=grant)
    assert success
    customer = await account_service.get_account_by_tag_id(
        token=event_admin_token, node_id=event_node.id, user_tag_id=volunteer_tag.id
    )
    assert customer is not None
    assert customer.vouchers == 3


async def test_free_ticket_grant_without_vouchers(
    user_service: UserService,
    till_service: TillService,
    account_service: AccountService,
    terminal_token: str,
    event_admin_token: str,
    cashier: Cashier,
    event_node: Node,
    till: Till,
    till_layout: TillLayout,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    voucher_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="test-role",
            event_privileges=[EventPrivilege.supervised_terminal_login],
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
    await till_service.profile.update_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile_id=till.active_profile_id,
        profile=NewTillProfile(
            name="test-profile",
            description="",
            layout_id=till_layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=True,
            enable_ssp_payment=True,
            enable_cash_payment=False,
            enable_card_payment=False,
        ),
    )

    # after updating the cashier roles we need to log out and log in with the new role
    await login_supervised_user(cashier.user_tag_uid, voucher_role.id)

    volunteer_tag = await create_random_user_tag()
    grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag.uid, user_tag_pin=volunteer_tag.pin)

    with pytest.raises(AccessDenied):
        await account_service.grant_free_tickets(token=terminal_token, new_free_ticket_grant=grant)

    await user_service.update_user_role_privileges(
        token=event_admin_token,
        node_id=event_node.id,
        role_id=voucher_role.id,
        can_assign_all_roles=False,
        assignable_role_ids=[],
        event_privileges=[EventPrivilege.grant_free_tickets],
        node_privileges=[],
    )

    success = await account_service.grant_free_tickets(token=terminal_token, new_free_ticket_grant=grant)
    assert success
    customer = await account_service.get_account_by_tag_id(
        token=event_admin_token, node_id=event_node.id, user_tag_id=volunteer_tag.id
    )
    assert customer is not None
    assert customer.vouchers == 0

    with pytest.raises(AccessDenied):
        await account_service.grant_vouchers(token=terminal_token, user_tag_uid=volunteer_tag.uid, vouchers=3)

    await user_service.update_user_role_privileges(
        token=event_admin_token,
        node_id=event_node.id,
        role_id=voucher_role.id,
        can_assign_all_roles=False,
        assignable_role_ids=[],
        event_privileges=[
            EventPrivilege.supervised_terminal_login,
            EventPrivilege.grant_free_tickets,
            EventPrivilege.grant_vouchers,
        ],
        node_privileges=[],
    )

    # let's grant the new volunteer tickets via the extra api
    account = await account_service.grant_vouchers(token=terminal_token, user_tag_uid=volunteer_tag.uid, vouchers=3)
    assert account is not None
    assert 3 == account.vouchers
