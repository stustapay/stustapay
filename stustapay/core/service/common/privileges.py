from sftkit.database import Connection

from stustapay.core.schema.user import EventPrivilege, NodePrivilege


async def fetch_user_privileges_at_node(
    conn: Connection, *, user_id: int, event_node_id: int | None, node_id: int | None
) -> tuple[list[EventPrivilege], list[NodePrivilege]]:
    event_privileges = []
    if event_node_id is not None:
        event_privileges = await conn.fetchval("select user_event_privileges($1, $2)", user_id, event_node_id)
    node_privileges = []
    if node_id is not None:
        node_privileges = await conn.fetchval("select user_node_privileges($1, $2)", user_id, node_id)
    return set(EventPrivilege[val] for val in event_privileges), set(NodePrivilege[val] for val in node_privileges)


async def fetch_user_privileges_at_node_for_role(
    conn: Connection, *, user_id: int, role_id: int, event_node_id: int | None, node_id: int | None
) -> tuple[list[EventPrivilege], list[NodePrivilege]]:
    event_privileges = []
    if event_node_id is not None:
        event_privileges = await conn.fetchval(
            "select user_event_privileges_for_role($1, $2, $3)", user_id, event_node_id, role_id
        )
    node_privileges = []
    if node_id is not None:
        node_privileges = await conn.fetchval(
            "select user_node_privileges_for_role($1, $2, $3)", user_id, node_id, role_id
        )
    return set(EventPrivilege[val] for val in event_privileges), set(NodePrivilege[val] for val in node_privileges)
