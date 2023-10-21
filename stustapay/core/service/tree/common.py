from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.common.error import NotFound
from stustapay.framework.database import Connection


async def fetch_node(conn: Connection, node_id: int) -> Node | None:
    node = await conn.fetch_maybe_one(
        Node, "select n.*, '{}'::json array as children from node_with_allowed_objects n where n.id = $1", node_id
    )
    if node is None:
        return None

    node_map: dict[int, Node] = {node.id: node}

    children = await conn.fetch_many(
        Node,
        "select n.*, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "where n.path like $1 order by path asc",
        f"{node.path}/%",
    )
    for child in children:
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

    return node


async def get_tree_for_current_user(conn: Connection, user_node_id: int) -> Node:
    user_node = await conn.fetch_maybe_one(
        Node, "select n.*, '{}'::json array as children from node_with_allowed_objects n where n.id = $1", user_node_id
    )
    if user_node is None:
        raise NotFound(element_typ="node", element_id=user_node_id)

    trace_to_root = await conn.fetch_many(
        Node,
        "select n.*, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "where id = any($1) order by path asc",
        user_node.parent_ids,
    )
    assert len(trace_to_root) > 0
    root_node = trace_to_root[0]
    node_map: dict[int, Node] = {user_node.id: user_node, root_node.id: root_node}
    for child in trace_to_root[1:]:  # the first element in the list is the root node, we want to skip that one
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

    if user_node.parent != user_node.id:
        node_map[user_node.parent].children.append(user_node)

    children = await conn.fetch_many(
        Node,
        "select n.*, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "where n.path like $1 order by path asc",
        f"{user_node.path}/%",
    )
    for child in children:
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

    return root_node


async def fetch_event_node_for_node(conn: Connection, node_id: int) -> Node | None:
    event_node_id = await conn.fetchval("select event_node_id from node where id = $1", node_id)
    if event_node_id is None:
        raise NotFound(element_typ="node", element_id=node_id)
    return await fetch_node(conn=conn, node_id=event_node_id)


async def fetch_restricted_event_settings_for_node(conn: Connection, node_id: int) -> RestrictedEventSettings:
    event_node_id = await conn.fetchval("select event_node_id from node where id = $1", node_id)
    if event_node_id is None:
        raise NotFound(element_typ="node", element_id=node_id)
    return await conn.fetch_one(
        RestrictedEventSettings, "select * from event e join node n on n.event_id = e.id where n.id = $1", event_node_id
    )
