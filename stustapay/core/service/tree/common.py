from stustapay.core.schema.tree import Node
from stustapay.framework.database import Connection


async def fetch_node(conn: Connection, node_id: int) -> Node | None:
    # TODO: currently children are not fetched
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


async def fetch_event_node_for_node(conn: Connection, node_id: int) -> Node | None:
    # TODO: tree, for now we expect the nodes to be used to be actual events
    return await fetch_node(conn=conn, node_id=node_id)
