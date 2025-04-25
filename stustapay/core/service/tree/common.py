from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.schema.media import Blob, EventDesign
from stustapay.core.schema.tree import (
    Language,
    Node,
    NodeSeenByUser,
    PublicEventSettings,
    RestrictedEventSettings,
)
from stustapay.core.schema.user import CurrentUser
from stustapay.core.service.common.error import NotFound
from stustapay.core.service.media import fetch_blob


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

    trace_to_root = await conn.fetch_many(
        NodeSeenByUser,
        "select n.*, u.privileges_at_node, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "join user_privileges_at_node($1) u on n.id = u.node_id "
        "where id = any($2) order by path asc",
        current_user.id,
        user_node.parent_ids,
    )
    assert len(trace_to_root) > 0
    root_node = trace_to_root[0]
    node_map: dict[int, NodeSeenByUser] = {user_node.id: user_node, root_node.id: root_node}
    for child in trace_to_root[1:]:  # the first element in the list is the root node, we want to skip that one
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

    if user_node.parent != user_node.id:
        node_map[user_node.parent].children.append(user_node)

    children = await conn.fetch_many(
        NodeSeenByUser,
        "select n.*, u.privileges_at_node, '{}'::json array as children "
        "from node_with_allowed_objects n "
        "join user_privileges_at_node($1) u on n.id = u.node_id "
        "where n.path like $2 order by path asc",
        current_user.id,
        f"{user_node.path}/%",
    )
    for child in children:
        node_map[child.parent].children.append(child)
        node_map[child.id] = child

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


async def fetch_event_design(conn: Connection, node_id: int) -> EventDesign:
    design = await conn.fetch_maybe_one(EventDesign, "select * from event_design where node_id = $1", node_id)
    if design is None:
        return EventDesign(bon_logo_blob_id=None)
    return design


async def fetch_event_logo(conn: Connection, node_id: int) -> Blob | None:
    event_design = await fetch_event_design(conn=conn, node_id=node_id)
    if event_design.bon_logo_blob_id is not None:
        return await fetch_blob(conn=conn, blob_id=event_design.bon_logo_blob_id)
    return None
