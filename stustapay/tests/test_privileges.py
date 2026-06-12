# pylint: disable=redefined-outer-name
import secrets

from sftkit.database import Connection

from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import NewNode
from stustapay.core.schema.user import EventPrivilege, NewUser, NewUserRole, NewUserToRoles, NodePrivilege
from stustapay.core.service.tree.service import create_node
from stustapay.core.service.user import UserService, associate_user_to_role


async def test_event_privileges_visible_below_event_node(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    event_admin_user,
):
    admin_user, _ = event_admin_user
    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="event-stats-role",
            is_privileged=False,
            event_privileges=[EventPrivilege.customer_management],
            node_privileges=[],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=None,
        user_id=admin_user.id,
        role_id=role.id,
    )

    till_node = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="till-location", description=""),
    )

    event_stats_at_event = await db_connection.fetchval(
        "select $1 = any(event_privileges_at_node) from user_privileges_at_node($2) where node_id = $3",
        EventPrivilege.customer_management.name,
        admin_user.id,
        event_node.id,
    )
    event_stats_at_till = await db_connection.fetchval(
        "select $1 = any(event_privileges_at_node) from user_privileges_at_node($2) where node_id = $3",
        EventPrivilege.customer_management.name,
        admin_user.id,
        till_node.id,
    )

    assert event_stats_at_event is True
    assert event_stats_at_till is True


async def test_node_privileges_visible_below_event_node(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    event_admin_user,
):
    admin_user, _ = event_admin_user
    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="booking-role",
            is_privileged=False,
            event_privileges=[],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=None,
        user_id=admin_user.id,
        role_id=role.id,
    )

    till_node = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="booking-location", description=""),
    )

    can_book_at_till = await db_connection.fetchval(
        "select $1 = any(node_privileges_at_node) from user_privileges_at_node($2) where node_id = $3",
        NodePrivilege.can_book_orders.name,
        admin_user.id,
        till_node.id,
    )

    assert can_book_at_till is True


async def test_node_administration_privileges_only_visible_at_assigned_subnode(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    create_random_user_tag,
):
    user_tag = await create_random_user_tag()
    test_user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"test-user-{secrets.token_hex(16)}",
            display_name="test-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )

    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="admin-subnode", description=""),
    )

    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-admin-role",
            is_privileged=False,
            event_privileges=[],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=subnode,
        current_user_id=None,
        user_id=test_user.id,
        role_id=role.id,
    )

    node_admin_at_event = await db_connection.fetchval(
        "select $1 = any(node_privileges_at_node) from user_privileges_at_node($2) where node_id = $3",
        NodePrivilege.node_administration.name,
        test_user.id,
        event_node.id,
    )
    node_admin_at_subnode = await db_connection.fetchval(
        "select $1 = any(node_privileges_at_node) from user_privileges_at_node($2) where node_id = $3",
        NodePrivilege.node_administration.name,
        test_user.id,
        subnode.id,
    )

    assert node_admin_at_event is False
    assert node_admin_at_subnode is True


async def test_terminal_user_privileges_without_till(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    event_admin_user,
):
    admin_user, _ = event_admin_user
    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-role",
            is_privileged=False,
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=admin_user.id, role_ids=[role.id]),
    )

    privileges = await db_connection.fetchrow(
        "select event_privileges, node_privileges from terminal_user_privileges($1, $2, $3)",
        admin_user.id,
        role.id,
        None,
    )
    assert privileges is not None
    assert EventPrivilege.terminal_login.name in privileges["event_privileges"]
    assert privileges["node_privileges"] == []


async def test_terminal_user_privileges_with_till(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    event_admin_user,
    till: Till,
):
    admin_user, _ = event_admin_user
    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="terminal-till-role",
            is_privileged=False,
            event_privileges=[EventPrivilege.terminal_login],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=admin_user.id, role_ids=[role.id]),
    )

    privileges = await db_connection.fetchrow(
        "select event_privileges, node_privileges from terminal_user_privileges($1, $2, $3)",
        admin_user.id,
        role.id,
        till.node_id,
    )
    assert privileges is not None
    assert EventPrivilege.terminal_login.name in privileges["event_privileges"]
    assert NodePrivilege.can_book_orders.name in privileges["node_privileges"]
