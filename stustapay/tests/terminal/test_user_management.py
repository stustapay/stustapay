# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import pytest

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import (
    CurrentUser,
    NewUser,
    NewUserRole,
    UserRole,
    UserTag,
)
from stustapay.core.service.account import AccountService
from stustapay.core.service.common.error import AccessDenied, InvalidArgument
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import UserTagService
from stustapay.framework.database import Connection
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.terminal.conftest import Finanzorga


async def test_user_creation(
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
    terminal_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    test_role1: UserRole = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(name="test-role-1", is_privileged=False, privileges=[]),
    )
    user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(login="test-cashier", display_name="", user_tag_uid=user_tag.uid, user_tag_pin=user_tag.pin),
        role_ids=[test_role1.id],
    )
    assert user is not None
    assert user.login == "test-cashier"
    assert user.cashier_account_id is None
    assert user.transport_account_id is None
    assert user.user_tag_uid == user_tag.uid
    # Test creation if user already exists, then this should return an error
    with pytest.raises(InvalidArgument):
        await user_service.create_user_terminal(
            token=terminal_token,
            new_user=NewUser(login="test-cashier", display_name="", user_tag_uid=user_tag.uid),
        )

    # TODO: re-enable check once tree visibility rules are properly implemented for terminal api
    # privileged_role: UserRole = await user_service.create_user_role(
    #     token=admin_token,
    #     node_id=event_node.id,
    #     new_role=NewUserRole(name="privileged-role", is_privileged=True, privileges=[]),
    # )
    # with pytest.raises(AccessDenied):
    #     await user_service.update_user_roles_terminal(
    #         token=terminal_token, user_tag_uid=user_tag.uid, role_names=[privileged_role.name]
    #     )


async def test_terminal_user_management(
    till_service: TillService, terminal_token: str, cashier: Cashier, finanzorga: Finanzorga
):
    await till_service.logout_user(token=terminal_token)
    # Cashier cannot simply login
    with pytest.raises(AccessDenied):
        await till_service.check_user_login(token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid))
    with pytest.raises(AccessDenied):
        await till_service.login_user(
            token=terminal_token,
            user_tag=UserTag(uid=cashier.user_tag_uid),
            user_role_id=cashier.cashier_role.id,
        )

    # Admins can login
    roles: list[UserRole] = await till_service.check_user_login(
        token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid)
    )
    for role in roles:
        orga: CurrentUser = await till_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid), user_role_id=role.id
        )
        assert orga is not None
        assert role.name == orga.active_role_name
        assert role.id == orga.active_role_id

    # log in finanzorga as supervisor
    await till_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=finanzorga.user_tag_uid),
        user_role_id=finanzorga.finanzorga_role.id,
    )
    # Now Cashiers can login
    roles = await till_service.check_user_login(token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid))
    assert 1 == len(roles)
    cashier_role = roles[0]
    login_res = await till_service.login_user(
        token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid), user_role_id=cashier_role.id
    )
    assert login_res is not None
    assert cashier_role.name == login_res.active_role_name
    assert cashier_role.id == login_res.active_role_id

    user = await till_service.get_current_user(token=terminal_token)
    assert user is not None
    assert cashier_role.name == user.active_role_name
    assert cashier_role.id == user.active_role_id

    await till_service.logout_user(token=terminal_token)
    user = await till_service.get_current_user(token=terminal_token)
    assert user is None

    # non supervisors cannot login when a supervisor is logged in with a non-supervisor role
    with pytest.raises(AccessDenied):
        await till_service.login_user(
            token=terminal_token,
            user_tag=UserTag(uid=cashier.user_tag_uid),
            user_role_id=cashier.cashier_role.id,
        )

    await till_service.login_user(
        token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid), user_role_id=cashier.cashier_role.id
    )


async def test_switch_user_tag(
    user_service: UserService,
    user_tag_service: UserTagService,
    account_service: AccountService,
    db_connection: Connection,
    event_node: Node,
    terminal_token: str,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    new_user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login="test-user", display_name="test-user", user_tag_uid=user_tag.uid, user_tag_pin=user_tag.pin
        ),
    )
    account_id = await db_connection.fetchval(
        "select id from account_with_history where user_tag_uid = $1", user_tag.uid
    )

    acc = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=account_id)
    assert acc is not None
    assert user_tag.uid == acc.user_tag_uid
    await account_service.switch_account_tag_uid_terminal(
        token=terminal_token,
        account_id=account_id,
        new_user_tag_uid=new_user_tag.uid,
        new_user_tag_pin=new_user_tag.pin,
        comment="foobar",
    )
    acc = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=account_id)
    assert acc is not None
    assert new_user_tag.uid == acc.user_tag_uid
    assert 1 == len(acc.tag_history)
    assert "foobar" == acc.tag_history[0].comment
    user_info = await user_service.get_user(token=event_admin_token, node_id=event_node.id, user_id=user.id)
    assert user_info is not None
    assert new_user_tag.uid == user_info.user_tag_uid

    user_tag_2 = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=new_user_tag.id
    )
    assert user_tag_2 is not None
    assert 0 == len(user_tag_2.account_history)

    user_tag_1 = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_1 is not None
    assert 1 == len(user_tag_1.account_history)
    assert acc.id == user_tag_1.account_history[0].account_id
