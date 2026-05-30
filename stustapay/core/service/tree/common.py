from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import NotFound

from stustapay.core.schema.language import Language
from stustapay.core.schema.tree import (
    Node,
    NodeSeenByUser,
    PublicEventSettings,
    RestrictedEventSettings,
)
from stustapay.core.schema.user import CurrentUser


class TranslationText(BaseModel):
    lang_code: Language
    type: str
    content: str


async def _fetch_translation_textx(conn: Connection, event_id: int) -> dict[Language, dict[str, str]]:
    texts = await conn.fetch_many(
        TranslationText, "select lang_code, type, content from translation_text where event_id = $1", event_id
    )
    result: dict[Language, dict[str, str]] = {}
    for text in texts:
        if text.lang_code not in result:
            result[text.lang_code] = {}
        result[text.lang_code][text.type] = text.content
    return result


async def fetch_node(conn: Connection, node_id: int) -> Node | None:
    node = await conn.fetch_maybe_one(
        Node, "select n.*, '{}'::json array as children from node_with_allowed_objects n where n.id = $1", node_id
    )
    if node is None:
        return None
    if node.event is not None:
        node.event.translation_texts = await _fetch_translation_textx(conn=conn, event_id=node.event.id)
    node_map: dict[int, Node] = {node.id: node}

    children = await conn.fetch_many(
        Node,
        "select n.*, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "where n.path like $1 order by path asc",
        f"{node.path}/%",
    )
    for child in children:
        if child.event is not None:
            child.event.translation_texts = await _fetch_translation_textx(conn=conn, event_id=child.event.id)
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

    return node


async def has_direct_role_assignment_in_scope(conn: Connection, user_id: int, scope_node: Node) -> bool:
    return await conn.fetchval(
        "select exists(select 1 from user_to_role where user_id = $1 and node_id = any($2))",
        user_id,
        scope_node.ids_to_root,
    )


async def fetch_direct_role_assignment_paths_in_subtree(conn: Connection, user_id: int, scope_node: Node) -> list[str]:
    rows = await conn.fetch(
        "select distinct n.path "
        "from node n "
        "join user_to_role utr on utr.node_id = n.id "
        "where utr.user_id = $1 and (n.id = $2 or n.path like $3) "
        "order by n.path asc",
        user_id,
        scope_node.id,
        f"{scope_node.path}/%",
    )
    return [row["path"] for row in rows]


async def fetch_visible_node_ids_for_user(
    conn: Connection,
    user_id: int,
    scope_node: Node,
    *,
    include_ancestor_context: bool,
    include_assignment_ancestors: bool = True,
) -> set[int]:
    if await has_direct_role_assignment_in_scope(conn=conn, user_id=user_id, scope_node=scope_node):
        subtree_node_ids = await conn.fetch(
            "select id from node where id = $1 or path like $2",
            scope_node.id,
            f"{scope_node.path}/%",
        )
        visible_node_ids = {row["id"] for row in subtree_node_ids}
        if include_ancestor_context:
            visible_node_ids.update(scope_node.parent_ids)
        return visible_node_ids

    assigned_paths = await fetch_direct_role_assignment_paths_in_subtree(conn=conn, user_id=user_id, scope_node=scope_node)
    if len(assigned_paths) == 0:
        return set(scope_node.parent_ids + [scope_node.id]) if include_ancestor_context else set()
    subtree_nodes = await conn.fetch_many(
        Node,
        "select n.*, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "where n.id = $1 or n.path like $2 "
        "order by n.path asc",
        scope_node.id,
        f"{scope_node.path}/%",
    )

    visible_node_ids: set[int] = set(scope_node.parent_ids) if include_ancestor_context else set()
    for node in subtree_nodes:
        if any(
            node.path == assigned_path
            or node.path.startswith(f"{assigned_path}/")
            or (include_assignment_ancestors and assigned_path.startswith(f"{node.path}/"))
            for assigned_path in assigned_paths
        ):
            visible_node_ids.add(node.id)

    return visible_node_ids


async def get_tree_for_current_user(conn: Connection, current_user: CurrentUser) -> NodeSeenByUser:
    user_node = await conn.fetch_maybe_one(
        NodeSeenByUser,
        "select n.*, u.privileges_at_node, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "join user_privileges_at_node($1) u on n.id = u.node_id "
        "where n.id = $2",
        current_user.id,
        current_user.node_id,
    )
    if user_node is None:
        raise NotFound(element_type="node", element_id=current_user.node_id)

    visible_node_ids = await fetch_visible_node_ids_for_user(
        conn=conn,
        user_id=current_user.id,
        scope_node=user_node,
        include_ancestor_context=True,
    )
    visible_nodes = await conn.fetch_many(
        NodeSeenByUser,
        "select n.*, u.privileges_at_node, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "join user_privileges_at_node($1) u on n.id = u.node_id "
        "where n.id = any($2) order by path asc",
        current_user.id,
        list(visible_node_ids),
    )

    assert len(visible_nodes) > 0
    node_map: dict[int, NodeSeenByUser] = {}
    for node in visible_nodes:
        node.children = []
        node_map[node.id] = node

    root_node = visible_nodes[0]
    for node in visible_nodes[1:]:
        parent = node_map.get(node.parent)
        if parent is not None:
            parent.children.append(node)

    return root_node


async def fetch_event_for_node(conn: Connection, node: Node) -> PublicEventSettings:
    return await conn.fetch_one(
        PublicEventSettings,
        "select * from event_with_translations e join node n on n.event_id = e.id where n.id = $1",
        node.event_node_id,
    )


async def fetch_event_node_for_node(conn: Connection, node_id: int) -> Node | None:
    event_node_id = await conn.fetchval("select event_node_id from node where id = $1", node_id)
    if event_node_id is None:
        raise NotFound(element_type="node", element_id=node_id)
    return await fetch_node(conn=conn, node_id=event_node_id)


async def fetch_restricted_event_settings_for_node(conn: Connection, node_id: int) -> RestrictedEventSettings:
    event_node_id = await conn.fetchval("select event_node_id from node where id = $1", node_id)
    if event_node_id is None:
        raise NotFound(element_type="node", element_id=node_id)
    settings = await conn.fetch_one(
        RestrictedEventSettings,
        "select e.* from event_with_translations e join node n on n.event_id = e.id where n.id = $1",
        event_node_id,
    )
    settings.translation_texts = await _fetch_translation_textx(conn=conn, event_id=settings.id)
    return settings
