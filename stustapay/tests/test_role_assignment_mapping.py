import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUserRole
from stustapay.core.service.user import UserService


async def test_cannot_add_explicit_mapping_when_can_assign_all_roles(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
):
    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="assign-all-role",
            can_assign_all_roles=True,
            event_privileges=[],
            node_privileges=[],
        ),
    )
    target = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="target-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )

    with pytest.raises(Exception, match="Cannot add explicit assignable roles"):
        await db_connection.execute(
            "insert into user_role_to_assignable_role (assigner_role_id, assignable_role_id) values ($1, $2)",
            role.id,
            target.id,
        )


async def test_cannot_set_can_assign_all_roles_with_existing_mappings(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
):
    assigner = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="mapped-assigner-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    target = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="mapped-target-role",
            event_privileges=[],
            node_privileges=[],
        ),
    )
    await user_service.update_user_role_privileges(
        token=event_admin_token,
        node_id=event_node.id,
        role_id=assigner.id,
        can_assign_all_roles=False,
        assignable_role_ids=[target.id],
        event_privileges=[],
        node_privileges=[],
    )

    with pytest.raises(Exception, match="Cannot set can_assign_all_roles"):
        await db_connection.execute("update user_role set can_assign_all_roles = true where id = $1", assigner.id)
