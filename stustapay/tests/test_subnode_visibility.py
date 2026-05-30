# pylint: disable=missing-kwoa,no-value-for-parameter
import secrets

from stustapay.core.schema.tree import NewNode, Node, NodeSeenByUser
from stustapay.core.schema.user import ADMIN_ROLE_ID, NewUser, NewUserToRoles, User
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.user import UserService


def _find_node(start: NodeSeenByUser, node_id: int) -> NodeSeenByUser | None:
    if start.id == node_id:
        return start

    for child in start.children:
        found = _find_node(child, node_id)
        if found is not None:
            return found

    return None


async def _create_event_user(user_service: UserService, admin_token: str, event_node: Node, login_prefix: str) -> User:
    return await user_service.create_user(
        token=admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"{login_prefix}-{secrets.token_hex(8)}",
            description="",
            display_name=login_prefix,
        ),
        password="rolf",
    )


async def test_tree_hides_sibling_subnodes_for_users_with_only_one_subnode_assignment(
    tree_service: TreeService,
    user_service: UserService,
    event_node: Node,
    global_admin_token: str,
):
    visible_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Visible", description=""),
    )
    hidden_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Hidden", description=""),
    )
    visible_child = await tree_service.create_node(
        token=global_admin_token,
        node_id=visible_node.id,
        new_node=NewNode(name="Visible Child", description=""),
    )

    restricted_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="restricted-user",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=visible_node.id,
        user_to_roles=NewUserToRoles(user_id=restricted_user.id, role_ids=[ADMIN_ROLE_ID]),
    )

    login_result = await user_service.login_user(username=restricted_user.login, password="rolf")
    assert login_result.success is not None

    tree = await tree_service.get_tree_for_current_user(token=login_result.success.token)
    visible_event = _find_node(tree, event_node.id)
    assert visible_event is not None
    assert [child.id for child in visible_event.children] == [visible_node.id]
    assert _find_node(tree, visible_child.id) is not None
    assert _find_node(tree, hidden_node.id) is None


async def test_tree_unions_multiple_assigned_subtrees_for_same_user(
    tree_service: TreeService,
    user_service: UserService,
    event_node: Node,
    global_admin_token: str,
):
    first_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="First", description=""),
    )
    second_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Second", description=""),
    )
    hidden_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Hidden", description=""),
    )

    restricted_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="multi-subnode-user",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=first_node.id,
        user_to_roles=NewUserToRoles(user_id=restricted_user.id, role_ids=[ADMIN_ROLE_ID]),
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=second_node.id,
        user_to_roles=NewUserToRoles(user_id=restricted_user.id, role_ids=[ADMIN_ROLE_ID]),
    )

    login_result = await user_service.login_user(username=restricted_user.login, password="rolf")
    assert login_result.success is not None

    tree = await tree_service.get_tree_for_current_user(token=login_result.success.token)
    visible_event = _find_node(tree, event_node.id)
    assert visible_event is not None
    assert [child.id for child in visible_event.children] == [first_node.id, second_node.id]
    assert _find_node(tree, hidden_node.id) is None


async def test_event_level_assignment_keeps_full_event_tree_visible(
    tree_service: TreeService,
    user_service: UserService,
    event_node: Node,
    global_admin_token: str,
):
    first_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="First", description=""),
    )
    second_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Second", description=""),
    )

    event_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="event-assigned-user",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=event_user.id, role_ids=[ADMIN_ROLE_ID]),
    )

    login_result = await user_service.login_user(username=event_user.login, password="rolf")
    assert login_result.success is not None

    tree = await tree_service.get_tree_for_current_user(token=login_result.success.token)
    visible_event = _find_node(tree, event_node.id)
    assert visible_event is not None
    assert [child.id for child in visible_event.children] == [first_node.id, second_node.id]


async def test_list_users_only_returns_users_assigned_in_visible_subtree(
    tree_service: TreeService,
    user_service: UserService,
    event_node: Node,
    global_admin_token: str,
):
    visible_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Visible", description=""),
    )
    hidden_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Hidden", description=""),
    )

    scoped_admin = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="scoped-admin",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=visible_node.id,
        user_to_roles=NewUserToRoles(user_id=scoped_admin.id, role_ids=[ADMIN_ROLE_ID]),
    )

    visible_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="visible-user",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=visible_node.id,
        user_to_roles=NewUserToRoles(user_id=visible_user.id, role_ids=[ADMIN_ROLE_ID]),
    )

    hidden_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="hidden-user",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=hidden_node.id,
        user_to_roles=NewUserToRoles(user_id=hidden_user.id, role_ids=[ADMIN_ROLE_ID]),
    )

    unassigned_user = await _create_event_user(
        user_service=user_service,
        admin_token=global_admin_token,
        event_node=event_node,
        login_prefix="unassigned-user",
    )

    login_result = await user_service.login_user(username=scoped_admin.login, password="rolf")
    assert login_result.success is not None

    users = await user_service.list_users(token=login_result.success.token, node_id=event_node.id)
    visible_user_ids = {user.id for user in users}

    assert scoped_admin.id in visible_user_ids
    assert visible_user.id in visible_user_ids
    assert hidden_user.id not in visible_user_ids
    assert unassigned_user.id not in visible_user_ids
