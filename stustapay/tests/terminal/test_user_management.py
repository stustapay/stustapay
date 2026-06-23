# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import secrets

import pytest
from sftkit.database import Connection

from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.tree import NewNode, Node
from stustapay.core.schema.user import (
    CurrentUser,
    EventPrivilege,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    NodePrivilege,
    UserRole,
    UserRoleAssignmentPayload,
    UserTag,
)
from stustapay.core.service.account import AccountService
from stustapay.core.service.common.error import AccessDenied, InvalidArgument
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.tree.service import create_node
from stustapay.core.service.user import UserService, associate_user_to_role
from stustapay.core.service.user_tag import UserTagService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.terminal.conftest import CreateTerminalToken, Finanzorga


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
        new_role=NewUserRole(
            name=f"test-role-1-{secrets.token_hex(8)}",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(login="test-cashier", display_name="", user_tag_uid=user_tag.uid, user_tag_pin=user_tag.pin),
        role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[test_role1.id])],
    )
    assert user is not None
    assert user.login == "test-cashier"
    assert user.transport_account_id is None
    assert user.user_tag_uid == user_tag.uid
    # Test creation if user already exists, then this should return an error
    with pytest.raises(InvalidArgument):
        await user_service.create_user_terminal(
            token=terminal_token,
            new_user=NewUser(login="test-cashier", display_name="", user_tag_uid=user_tag.uid),
        )


async def test_terminal_user_management(
    terminal_service: TerminalService, terminal_token: str, cashier: Cashier, finanzorga: Finanzorga
):
    await terminal_service.logout_user(token=terminal_token)
    # Cashier cannot simply login
    with pytest.raises(AccessDenied):
        await terminal_service.check_user_login(token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid))
    with pytest.raises(AccessDenied):
        await terminal_service.login_user(
            token=terminal_token,
            user_tag=UserTag(uid=cashier.user_tag_uid),
            user_role_id=cashier.cashier_role.id,
        )

    # Admins can login
    roles: list[UserRole] = await terminal_service.check_user_login(
        token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid)
    )
    for role in roles:
        orga: CurrentUser = await terminal_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid), user_role_id=role.id
        )
        assert orga is not None
        assert role.name == orga.active_role_name
        assert role.id == orga.active_role_id

    # log in finanzorga as supervisor
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=finanzorga.user_tag_uid),
        user_role_id=finanzorga.finanzorga_role.id,
    )
    # Now Cashiers can login
    roles = await terminal_service.check_user_login(token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid))
    assert 1 == len(roles)
    cashier_role = roles[0]
    login_res = await terminal_service.login_user(
        token=terminal_token, user_tag=UserTag(uid=cashier.user_tag_uid), user_role_id=cashier_role.id
    )
    assert login_res is not None
    assert cashier_role.name == login_res.active_role_name
    assert cashier_role.id == login_res.active_role_id

    user = await terminal_service.get_current_user(token=terminal_token)
    assert user is not None
    assert cashier_role.name == user.active_role_name
    assert cashier_role.id == user.active_role_id

    await terminal_service.logout_user(token=terminal_token)
    user = await terminal_service.get_current_user(token=terminal_token)
    assert user is None

    # non supervisors cannot login when a supervisor is logged in with a non-supervisor role
    with pytest.raises(AccessDenied):
        await terminal_service.login_user(
            token=terminal_token,
            user_tag=UserTag(uid=cashier.user_tag_uid),
            user_role_id=cashier.cashier_role.id,
        )

    await terminal_service.login_user(
        token=terminal_token, user_tag=UserTag(uid=finanzorga.user_tag_uid), user_role_id=cashier.cashier_role.id
    )


async def test_subnode_terminal_login_role_can_login_directly(
    terminal_service: TerminalService,
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    create_random_user_tag: CreateRandomUserTag,
):
    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="terminal-login-subnode", description=""),
    )
    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=f"subnode-terminal-{secrets.token_hex(16)}", description=""),
    )
    terminal_token = (await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)).token

    login_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"subnode-terminal-login-{secrets.token_hex(16)}",
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[],
        ),
    )
    user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"subnode-terminal-login-user-{secrets.token_hex(16)}",
            display_name="subnode-terminal-login-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=subnode,
        current_user_id=None,
        user_id=user.id,
        role_id=login_role.id,
    )

    login_res = await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=user_tag.uid),
        user_role_id=login_role.id,
    )

    assert login_res.id == user.id
    assert login_res.active_role_id == login_role.id


async def test_terminal_config_exposes_available_roles_by_node(
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
):
    config = await terminal_service.get_terminal_config(token=terminal_token)
    assert config is not None
    assert len(config.available_roles_by_node) >= 1
    assert any(group.node_id == event_node.id for group in config.available_roles_by_node)


@pytest.mark.parametrize("with_till", [True, False])
async def test_terminal_config_reflects_active_role_privileges_only(
    db_connection: Connection,
    terminal_service: TerminalService,
    event_node: Node,
    user_service: UserService,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    create_terminal_token: CreateTerminalToken,
    with_till: bool,
):
    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="role-assignment-subnode", description=""),
    )
    terminal_token = await create_terminal_token(with_till=with_till)
    supervised_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"supervised-book-orders-{secrets.token_hex(16)}",
            event_privileges=[EventPrivilege.supervised_terminal_login],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    terminal_login_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"terminal-login-vouchers-{secrets.token_hex(16)}",
            event_privileges=[
                EventPrivilege.terminal_login,
                EventPrivilege.create_user,
                EventPrivilege.grant_vouchers,
                EventPrivilege.grant_free_tickets,
            ],
            node_privileges=[],
        ),
    )
    user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"multi-role-user-{secrets.token_hex(16)}",
            display_name="multi-role-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=user.id,
            role_ids=[supervised_role.id],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=subnode.id,
        user_to_roles=NewUserToRoles(
            user_id=user.id,
            role_ids=[terminal_login_role.id],
        ),
    )

    await terminal_service.logout_user(token=terminal_token)
    login_res = await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=user_tag.uid),
        user_role_id=supervised_role.id,
    )
    assert login_res.active_role_id == supervised_role.id

    config = await terminal_service.get_terminal_config(token=terminal_token)
    assert config is not None
    assert set(config.user_event_privileges or []) == {EventPrivilege.supervised_terminal_login}
    if with_till:
        assert set(config.user_node_privileges or []) == {NodePrivilege.can_book_orders}
    else:
        assert set(config.user_node_privileges or []) == set()


async def test_terminal_config_includes_assignable_roles_for_correct_node(
    db_connection: Connection,
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
    user_service: UserService,
    event_admin_token: str,
    create_terminal_token: CreateTerminalToken,
    create_random_user_tag: CreateRandomUserTag,
):
    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="role-assignment-subnode", description=""),
    )
    terminal_token = await create_terminal_token(with_till=False)
    supervised_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"supervised-book-orders-{secrets.token_hex(16)}",
            event_privileges=[EventPrivilege.supervised_terminal_login],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    terminal_login_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"terminal-login-vouchers-{secrets.token_hex(16)}",
            assignable_role_ids=[supervised_role.id],
            event_privileges=[
                EventPrivilege.terminal_login,
                EventPrivilege.create_user,
                EventPrivilege.grant_vouchers,
                EventPrivilege.grant_free_tickets,
            ],
            node_privileges=[],
        ),
    )
    user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"multi-role-user-{secrets.token_hex(16)}",
            display_name="multi-role-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=user.id,
            role_ids=[supervised_role.id],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=subnode.id,
        user_to_roles=NewUserToRoles(
            user_id=user.id,
            role_ids=[terminal_login_role.id],
        ),
    )

    await terminal_service.logout_user(token=terminal_token)
    login_res = await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=user_tag.uid),
        user_role_id=terminal_login_role.id,
    )
    assert login_res.active_role_id == terminal_login_role.id

    config = await terminal_service.get_terminal_config(token=terminal_token)
    assignable_by_node = {group.node_id: {role.id for role in group.roles} for group in config.available_roles_by_node}
    assert subnode.id in assignable_by_node
    assert supervised_role.id in assignable_by_node[subnode.id]


async def test_terminal_config_includes_all_roles_for_assign_all_active_role(
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
    user_service: UserService,
    event_admin_token: str,
    finanzorga: Finanzorga,
):
    assignable_target_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-visible-assignable-role",
            event_privileges=[EventPrivilege.create_user],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )

    await terminal_service.logout_user(token=terminal_token)
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=finanzorga.user_tag_uid),
        user_role_id=finanzorga.finanzorga_role.id,
    )

    config = await terminal_service.get_terminal_config(token=terminal_token)
    assert config is not None
    role_ids = {role.id for group in config.available_roles_by_node for role in group.roles}
    assert assignable_target_role.id in role_ids


async def test_terminal_create_user_with_mapped_role(
    user_service: UserService,
    terminal_token: str,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    mapped_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-create-mapped-role",
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    user_tag = await create_random_user_tag()
    user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(
            login=f"privileged-created-{secrets.token_hex(16)}",
            display_name="privileged-created",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
        role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[mapped_role.id])],
    )
    assert user is not None

    assigned_roles = await user_service.list_role_assignments_for_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
    )
    assert len(assigned_roles) == 1
    assert assigned_roles[0].role_ids == [mapped_role.id]


async def test_terminal_update_user_with_mapped_role(
    user_service: UserService,
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    initial_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-update-initial-role",
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    replacement_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-update-replacement-role",
            event_privileges=[EventPrivilege.grant_vouchers],
            node_privileges=[NodePrivilege.view_node_stats],
        ),
    )
    user_tag = await create_random_user_tag()
    user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(
            login=f"mapped-updated-{secrets.token_hex(16)}",
            display_name="mapped-updated",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
        role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[initial_role.id])],
    )
    assert user is not None

    await user_service.update_user_roles_terminal(
        token=terminal_token,
        user_tag_uid=user_tag.uid,
        role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[replacement_role.id])],
    )

    user_info = await terminal_service.get_user_info(token=terminal_token, user_tag_uid=user_tag.uid)
    assert any(role.id == replacement_role.id for role in user_info.assigned_roles)
    assert not any(role.id == initial_role.id for role in user_info.assigned_roles)


async def test_terminal_cannot_update_roles_without_mapping(
    user_service: UserService,
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    replacement_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="replacement-non-mapped-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    limited_assignment_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="limited-terminal-assignment-role",
            assignable_role_ids=[replacement_role.id],
            event_privileges=[EventPrivilege.create_user, EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    protected_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="protected-role",
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    assigner_tag = await create_random_user_tag()
    assigner = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"limited-terminal-assigner-{secrets.token_hex(16)}",
            display_name="limited-terminal-assigner",
            user_tag_uid=assigner_tag.uid,
            user_tag_pin=assigner_tag.pin,
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=assigner.id, role_ids=[limited_assignment_role.id]),
    )

    target_tag = await create_random_user_tag()
    target_user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(
            login=f"protected-privileged-user-{secrets.token_hex(16)}",
            display_name="protected-privileged-user",
            user_tag_uid=target_tag.uid,
            user_tag_pin=target_tag.pin,
        ),
        role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[protected_role.id])],
    )
    assert target_user is not None

    await terminal_service.logout_user(token=terminal_token)
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=assigner_tag.uid),
        user_role_id=limited_assignment_role.id,
    )

    with pytest.raises(AccessDenied):
        await user_service.update_user_roles_terminal(
            token=terminal_token,
            user_tag_uid=target_tag.uid,
            role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[replacement_role.id])],
        )


async def test_terminal_cannot_assign_role_not_in_active_role_assignable_set(
    user_service: UserService,
    terminal_service: TerminalService,
    terminal_token: str,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    allowed_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"allowed-target-role-{secrets.token_hex(8)}",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    forbidden_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"forbidden-target-role-{secrets.token_hex(8)}",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    limited_assignment_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"limited-assignment-role-{secrets.token_hex(8)}",
            assignable_role_ids=[allowed_role.id],
            event_privileges=[EventPrivilege.create_user, EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    forbidden_assignment_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"forbidden-assignment-role-{secrets.token_hex(8)}",
            assignable_role_ids=[forbidden_role.id],
            event_privileges=[EventPrivilege.create_user, EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    assigner_tag = await create_random_user_tag()
    assigner = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"limited-assigner-{secrets.token_hex(16)}",
            display_name="limited-assigner",
            user_tag_uid=assigner_tag.uid,
            user_tag_pin=assigner_tag.pin,
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=assigner.id, role_ids=[limited_assignment_role.id, forbidden_assignment_role.id]
        ),
    )

    await terminal_service.logout_user(token=terminal_token)
    await terminal_service.login_user(
        token=terminal_token,
        user_tag=UserTag(uid=assigner_tag.uid),
        user_role_id=limited_assignment_role.id,
    )

    target_tag = await create_random_user_tag()
    with pytest.raises(AccessDenied):
        await user_service.create_user_terminal(
            token=terminal_token,
            new_user=NewUser(
                login=f"forbidden-role-user-{secrets.token_hex(16)}",
                display_name="forbidden-role-user",
                user_tag_uid=target_tag.uid,
                user_tag_pin=target_tag.pin,
            ),
            role_assignments=[UserRoleAssignmentPayload(node_id=event_node.id, role_ids=[forbidden_role.id])],
        )


async def test_create_and_update_user_roles_at_subnode(
    user_service: UserService,
    terminal_service: TerminalService,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    create_random_user_tag: CreateRandomUserTag,
):
    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="terminal-role-subnode", description=""),
    )
    subnode_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-only-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    replacement_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-replacement-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )

    user_tag = await create_random_user_tag()
    user = await user_service.create_user_terminal(
        token=terminal_token,
        new_user=NewUser(
            login=f"subnode-user-{secrets.token_hex(16)}",
            display_name="subnode-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
        role_assignments=[UserRoleAssignmentPayload(node_id=subnode.id, role_ids=[subnode_role.id])],
    )
    assert user is not None

    assigned_roles = await db_connection.fetch(
        "select role_id from user_to_role where user_id = $1 and node_id = $2",
        user.id,
        subnode.id,
    )
    assert len(assigned_roles) == 1
    assert assigned_roles[0]["role_id"] == subnode_role.id

    await user_service.update_user_roles_terminal(
        token=terminal_token,
        user_tag_uid=user_tag.uid,
        role_assignments=[UserRoleAssignmentPayload(node_id=subnode.id, role_ids=[replacement_role.id])],
    )
    assigned_roles = await db_connection.fetch(
        "select role_id from user_to_role where user_id = $1 and node_id = $2 order by role_id",
        user.id,
        subnode.id,
    )
    assert len(assigned_roles) == 1
    assert assigned_roles[0]["role_id"] == replacement_role.id

    user_info = await terminal_service.get_user_info(token=terminal_token, user_tag_uid=user_tag.uid)
    assert any(role.id == replacement_role.id and role.node_id == subnode.id for role in user_info.assigned_roles)


async def test_terminal_role_assignment_preserves_other_nodes(
    user_service: UserService,
    terminal_service: TerminalService,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    create_random_user_tag: CreateRandomUserTag,
):
    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="terminal-role-other-node", description=""),
    )
    event_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="event-node-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    subnode_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    replacement_subnode_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-replacement-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )

    user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"multi-node-user-{secrets.token_hex(16)}",
            display_name="multi-node-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=None,
        user_id=user.id,
        role_id=event_role.id,
    )
    await associate_user_to_role(
        conn=db_connection,
        node=subnode,
        current_user_id=None,
        user_id=user.id,
        role_id=subnode_role.id,
    )

    await user_service.update_user_roles_terminal(
        token=terminal_token,
        user_tag_uid=user_tag.uid,
        role_assignments=[
            UserRoleAssignmentPayload(node_id=subnode.id, role_ids=[replacement_subnode_role.id]),
        ],
    )

    event_node_roles = await db_connection.fetch(
        "select role_id from user_to_role where user_id = $1 and node_id = $2 order by role_id",
        user.id,
        event_node.id,
    )
    assert len(event_node_roles) == 1
    assert event_node_roles[0]["role_id"] == event_role.id

    subnode_roles = await db_connection.fetch(
        "select role_id from user_to_role where user_id = $1 and node_id = $2 order by role_id",
        user.id,
        subnode.id,
    )
    assert len(subnode_roles) == 1
    assert subnode_roles[0]["role_id"] == replacement_subnode_role.id

    assignments = await user_service.list_role_assignments_for_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
    )
    assignments_by_node = {assignment.node_id: assignment for assignment in assignments}
    assert assignments_by_node[event_node.id].role_ids == [event_role.id]
    assert assignments_by_node[subnode.id].role_ids == [replacement_subnode_role.id]

    user_info = await terminal_service.get_user_info(token=terminal_token, user_tag_uid=user_tag.uid)
    assigned_roles_by_node = {(role.node_id, role.id) for role in user_info.assigned_roles}
    assert (event_node.id, event_role.id) in assigned_roles_by_node
    assert (subnode.id, replacement_subnode_role.id) in assigned_roles_by_node
    assert (subnode.id, subnode_role.id) not in assigned_roles_by_node


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
        old_user_tag_pin=user_tag.pin,
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
