# pylint: disable=redefined-outer-name
import secrets

from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import (
    EventPrivilege,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    NodePrivilege,
)
from stustapay.core.service.user import UserService, list_assignable_roles_by_node_for_user
from stustapay.tests.conftest import CreateRandomUserTag


async def test_list_assignable_roles_by_node_scoped_to_active_role(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    assigner_tag = await create_random_user_tag()
    assigner = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"dual-role-assigner-{secrets.token_hex(16)}",
            display_name="dual-role-assigner",
            user_tag_uid=assigner_tag.uid,
            user_tag_pin=assigner_tag.pin,
        ),
    )
    limited_target_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="limited-target-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    limited_assignment_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="limited-active-assignment-role",
            assignable_role_ids=[limited_target_role.id],
            event_privileges=[],
            node_privileges=[],
        ),
    )
    privileged_assignment_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="privileged-active-assignment-role",
            can_assign_all_roles=True,
            event_privileges=[],
            node_privileges=[],
        ),
    )
    privileged_target_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="privileged-target-for-active-role",
            event_privileges=[EventPrivilege.create_user],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            user_id=assigner.id,
            role_ids=[limited_assignment_role.id, privileged_assignment_role.id],
        ),
    )

    limited_assignable = await list_assignable_roles_by_node_for_user(
        conn=db_connection,
        event_node=event_node,
        user_id=assigner.id,
        active_role_id=limited_assignment_role.id,
    )
    limited_role_ids = {role.id for group in limited_assignable for role in group.roles}
    assert privileged_target_role.id not in limited_role_ids
    assert limited_target_role.id in limited_role_ids

    privileged_assignable = await list_assignable_roles_by_node_for_user(
        conn=db_connection,
        event_node=event_node,
        user_id=assigner.id,
        active_role_id=privileged_assignment_role.id,
    )
    privileged_role_ids = {role.id for group in privileged_assignable for role in group.roles}
    assert privileged_target_role.id in privileged_role_ids
