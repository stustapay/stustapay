from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import UserRole
from stustapay.core.service.common.error import AccessDenied


async def fetch_assigner_role_ids_at_node(
    *,
    conn: Connection,
    user_id: int,
    node: Node,
    active_role_id: int | None,
) -> list[int]:
    if active_role_id is not None:
        return [active_role_id]

    role_ids = await conn.fetchval(
        "select coalesce(array_agg(distinct utr.role_id), '{}'::bigint[]) "
        "from user_to_role utr "
        "where utr.user_id = $1 and utr.node_id = any($2)",
        user_id,
        node.ids_to_root,
    )
    return list(role_ids or [])


async def list_assignable_roles_for_assigner_roles(
    *, conn: Connection, node: Node, assigner_role_ids: list[int]
) -> list[UserRole]:
    if len(assigner_role_ids) == 0:
        return []

    can_assign_all_roles = await conn.fetchval(
        "select exists(select 1 from user_role where id = any($1) and can_assign_all_roles)",
        assigner_role_ids,
    )
    if can_assign_all_roles:
        return await conn.fetch_many(
            UserRole,
            "select * from user_role_with_privileges where node_id = any($1) order by name",
            node.ids_to_root,
        )

    assignable_role_ids = await conn.fetchval(
        "select coalesce(array_agg(distinct assignable_role_id), '{}'::bigint[]) "
        "from user_role_to_assignable_role "
        "where assigner_role_id = any($1)",
        assigner_role_ids,
    )
    if len(assignable_role_ids) == 0:
        return []

    return await conn.fetch_many(
        UserRole,
        "select * from user_role_with_privileges where id = any($1) and node_id = any($2) order by name",
        assignable_role_ids,
        node.ids_to_root,
    )


async def assert_roles_assignable(
    *,
    conn: Connection,
    node: Node,
    assigner_role_ids: list[int],
    target_role_ids: set[int],
) -> None:
    if len(target_role_ids) == 0:
        return

    assignable_roles = await list_assignable_roles_for_assigner_roles(
        conn=conn, node=node, assigner_role_ids=assigner_role_ids
    )
    assignable_role_id_set = {role.id for role in assignable_roles}
    missing_role_ids = target_role_ids.difference(assignable_role_id_set)
    if len(missing_role_ids) > 0:
        raise AccessDenied(
            f"Assigning roles requires explicit assignment permission. Missing permission for role ids: {missing_role_ids}"
        )


async def user_can_assign_roles_at_node(
    *,
    conn: Connection,
    user_id: int,
    node: Node,
    active_role_id: int | None,
) -> bool:
    assigner_role_ids = await fetch_assigner_role_ids_at_node(
        conn=conn, user_id=user_id, node=node, active_role_id=active_role_id
    )
    assignable_roles = await list_assignable_roles_for_assigner_roles(
        conn=conn, node=node, assigner_role_ids=assigner_role_ids
    )
    return len(assignable_roles) > 0
