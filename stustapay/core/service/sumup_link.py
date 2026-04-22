from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.sumup import NodeSumUpConnectionStatus, ResolvedSumUpLink, SumUpConnectionSource
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.config import fetch_global_sumup_config
from stustapay.core.service.tree.common import fetch_event_node_for_node, fetch_node, fetch_restricted_event_settings_for_node
from stustapay.payment.sumup.api import SumUpApi, fetch_new_oauth_token


class NodeSumUpLinkRecord(BaseModel):
    node_id: int
    node_name: str
    merchant_code: str
    merchant_name: str | None = None
    refresh_token: str


@dataclass
class ResolvedSumUpAccess:
    source: SumUpConnectionSource
    source_node_id: int
    source_node_name: str
    merchant_code: str
    merchant_name: str | None = None
    api_key: str | None = None
    refresh_token: str | None = None
    oauth_client_id: str | None = None
    oauth_client_secret: str | None = None
    affiliate_key: str = ""

    @property
    def is_oauth(self) -> bool:
        return self.refresh_token is not None and self.oauth_client_id is not None and self.oauth_client_secret is not None


async def fetch_direct_node_sumup_link(conn: Connection, node_id: int) -> NodeSumUpLinkRecord | None:
    return await conn.fetch_maybe_one(
        NodeSumUpLinkRecord,
        "select l.node_id, n.name as node_name, l.merchant_code, l.merchant_name, l.refresh_token "
        "from node_sumup_link l "
        "join node n on n.id = l.node_id "
        "where l.node_id = $1",
        node_id,
    )


async def fetch_nearest_node_sumup_link_for_event(conn: Connection, event_node: Node) -> NodeSumUpLinkRecord | None:
    if len(event_node.parent_ids) == 0:
        return None
    return await conn.fetch_maybe_one(
        NodeSumUpLinkRecord,
        "with candidate_nodes(node_id, ord) as ("
        "    select * from unnest($1::bigint[]) with ordinality"
        ") "
        "select l.node_id, n.name as node_name, l.merchant_code, l.merchant_name, l.refresh_token "
        "from candidate_nodes c "
        "join node_sumup_link l on l.node_id = c.node_id "
        "join node n on n.id = l.node_id "
        "order by c.ord desc "
        "limit 1",
        event_node.parent_ids,
    )


async def count_linked_events_for_node(conn: Connection, node_id: int) -> int:
    return await conn.fetchval("select count(*) from node where event_id is not null and $1 = any(parent_ids)", node_id)


async def get_node_sumup_connection_status(conn: Connection, node: Node) -> NodeSumUpConnectionStatus:
    global_sumup = await fetch_global_sumup_config(conn=conn)
    direct_link = await fetch_direct_node_sumup_link(conn=conn, node_id=node.id)
    linked_event_count = await count_linked_events_for_node(conn=conn, node_id=node.id)
    return NodeSumUpConnectionStatus(
        node_id=node.id,
        node_name=node.name,
        connected=direct_link is not None,
        merchant_code=direct_link.merchant_code if direct_link is not None else None,
        merchant_name=direct_link.merchant_name if direct_link is not None else None,
        linked_event_count=linked_event_count,
        oauth_client_id=global_sumup.sumup_oauth_client_id,
        oauth_configured=bool(
            global_sumup.sumup_oauth_client_id.strip() and global_sumup.sumup_oauth_client_secret.strip()
        ),
        affiliate_key_configured=bool(global_sumup.sumup_affiliate_key.strip()),
    )


async def upsert_node_sumup_link(
    conn: Connection, *, node: Node, merchant_code: str, merchant_name: str | None, refresh_token: str
) -> NodeSumUpConnectionStatus:
    if node.event is not None or node.event_node_id is not None:
        raise InvalidArgument("SumUp merchant links can only be configured on nodes above events")
    await conn.execute(
        "insert into node_sumup_link (node_id, merchant_code, merchant_name, refresh_token, connected_at, updated_at) "
        "values ($1, $2, $3, $4, now(), now()) "
        "on conflict (node_id) do update set "
        "merchant_code = excluded.merchant_code, "
        "merchant_name = excluded.merchant_name, "
        "refresh_token = excluded.refresh_token, "
        "updated_at = now()",
        node.id,
        merchant_code,
        merchant_name,
        refresh_token,
    )
    return await get_node_sumup_connection_status(conn=conn, node=node)


async def delete_node_sumup_link(conn: Connection, *, node: Node) -> NodeSumUpConnectionStatus:
    if node.event is not None or node.event_node_id is not None:
        raise InvalidArgument("SumUp merchant links can only be configured on nodes above events")
    await conn.execute("delete from node_sumup_link where node_id = $1", node.id)
    return await get_node_sumup_connection_status(conn=conn, node=node)


async def resolve_sumup_access(conn: Connection, node_id: int) -> ResolvedSumUpAccess | None:
    event_node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
    assert event_node is not None
    event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
    global_sumup = await fetch_global_sumup_config(conn=conn)
    affiliate_key = global_sumup.sumup_affiliate_key or event_settings.sumup_affiliate_key or ""

    node_link = await fetch_nearest_node_sumup_link_for_event(conn=conn, event_node=event_node)
    if (
        node_link is not None
        and global_sumup.sumup_oauth_client_id.strip() != ""
        and global_sumup.sumup_oauth_client_secret.strip() != ""
    ):
        return ResolvedSumUpAccess(
            source=SumUpConnectionSource.node_link,
            source_node_id=node_link.node_id,
            source_node_name=node_link.node_name,
            merchant_code=node_link.merchant_code,
            merchant_name=node_link.merchant_name,
            refresh_token=node_link.refresh_token,
            oauth_client_id=global_sumup.sumup_oauth_client_id,
            oauth_client_secret=global_sumup.sumup_oauth_client_secret,
            affiliate_key=affiliate_key,
        )

    if (
        event_settings.sumup_oauth_refresh_token.strip() != ""
        and event_settings.sumup_oauth_client_id.strip() != ""
        and event_settings.sumup_oauth_client_secret.strip() != ""
        and event_settings.sumup_merchant_code.strip() != ""
    ):
        return ResolvedSumUpAccess(
            source=SumUpConnectionSource.legacy_event_oauth,
            source_node_id=event_node.id,
            source_node_name=event_node.name,
            merchant_code=event_settings.sumup_merchant_code,
            refresh_token=event_settings.sumup_oauth_refresh_token,
            oauth_client_id=event_settings.sumup_oauth_client_id,
            oauth_client_secret=event_settings.sumup_oauth_client_secret,
            affiliate_key=affiliate_key,
        )

    if event_settings.sumup_api_key.strip() != "" and event_settings.sumup_merchant_code.strip() != "":
        return ResolvedSumUpAccess(
            source=SumUpConnectionSource.legacy_event_api_key,
            source_node_id=event_node.id,
            source_node_name=event_node.name,
            merchant_code=event_settings.sumup_merchant_code,
            api_key=event_settings.sumup_api_key,
            affiliate_key=affiliate_key,
        )

    return None


async def create_sumup_api_for_node(
    conn: Connection,
    node_id: int,
    api_factory: Callable[[str, str], SumUpApi] | None = None,
) -> tuple[SumUpApi, ResolvedSumUpAccess] | None:
    access = await resolve_sumup_access(conn=conn, node_id=node_id)
    if access is None:
        return None
    create_api = api_factory or (lambda merchant_code, api_key: SumUpApi(api_key=api_key, merchant_code=merchant_code))
    if access.api_key is not None:
        return create_api(access.merchant_code, access.api_key), access
    if not access.is_oauth:
        return None
    token = await fetch_new_oauth_token(
        client_id=access.oauth_client_id,
        client_secret=access.oauth_client_secret,
        refresh_token=access.refresh_token,
    )
    if token is None:
        return None
    return create_api(access.merchant_code, token.access_token), access


async def enrich_event_sumup_settings(
    conn: Connection, *, node_id: int, event_settings: RestrictedEventSettings
) -> RestrictedEventSettings:
    global_sumup = await fetch_global_sumup_config(conn=conn)
    event_node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
    assert event_node is not None

    event_settings.sumup_global_oauth_configured = bool(
        global_sumup.sumup_oauth_client_id.strip() and global_sumup.sumup_oauth_client_secret.strip()
    )
    event_settings.sumup_global_affiliate_key_configured = bool(global_sumup.sumup_affiliate_key.strip())
    event_settings.sumup_legacy_api_key_configured = bool(
        event_settings.sumup_api_key.strip() and event_settings.sumup_merchant_code.strip()
    )
    event_settings.sumup_legacy_oauth_configured = bool(
        event_settings.sumup_oauth_refresh_token.strip()
        and event_settings.sumup_oauth_client_id.strip()
        and event_settings.sumup_oauth_client_secret.strip()
        and event_settings.sumup_merchant_code.strip()
    )

    access = await resolve_sumup_access(conn=conn, node_id=node_id)
    if access is None:
        event_settings.resolved_sumup_link = None
        return event_settings

    event_settings.resolved_sumup_link = ResolvedSumUpLink(
        source=access.source,
        source_node_id=access.source_node_id,
        source_node_name=access.source_node_name,
        merchant_code=access.merchant_code,
        merchant_name=access.merchant_name,
        inherited=access.source == SumUpConnectionSource.node_link and access.source_node_id != event_node.id,
    )
    return event_settings


async def resolve_terminal_sumup_access(
    conn: Connection, *, node_id: int, event_settings: RestrictedEventSettings | None = None
) -> ResolvedSumUpAccess | None:
    event_node = await fetch_event_node_for_node(conn=conn, node_id=node_id)
    assert event_node is not None
    resolved_event_settings = event_settings or await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
    global_sumup = await fetch_global_sumup_config(conn=conn)
    affiliate_key = global_sumup.sumup_affiliate_key or resolved_event_settings.sumup_affiliate_key or ""

    node_link = await fetch_nearest_node_sumup_link_for_event(conn=conn, event_node=event_node)
    if (
        node_link is not None
        and global_sumup.sumup_oauth_client_id.strip() != ""
        and global_sumup.sumup_oauth_client_secret.strip() != ""
    ):
        return ResolvedSumUpAccess(
            source=SumUpConnectionSource.node_link,
            source_node_id=node_link.node_id,
            source_node_name=node_link.node_name,
            merchant_code=node_link.merchant_code,
            merchant_name=node_link.merchant_name,
            refresh_token=node_link.refresh_token,
            oauth_client_id=global_sumup.sumup_oauth_client_id,
            oauth_client_secret=global_sumup.sumup_oauth_client_secret,
            affiliate_key=affiliate_key,
        )

    if (
        resolved_event_settings.sumup_oauth_refresh_token.strip() != ""
        and resolved_event_settings.sumup_oauth_client_id.strip() != ""
        and resolved_event_settings.sumup_oauth_client_secret.strip() != ""
        and resolved_event_settings.sumup_merchant_code.strip() != ""
    ):
        return ResolvedSumUpAccess(
            source=SumUpConnectionSource.legacy_event_oauth,
            source_node_id=event_node.id,
            source_node_name=event_node.name,
            merchant_code=resolved_event_settings.sumup_merchant_code,
            refresh_token=resolved_event_settings.sumup_oauth_refresh_token,
            oauth_client_id=resolved_event_settings.sumup_oauth_client_id,
            oauth_client_secret=resolved_event_settings.sumup_oauth_client_secret,
            affiliate_key=affiliate_key,
        )

    return None


async def fetch_node_or_raise(conn: Connection, node_id: int) -> Node:
    node = await fetch_node(conn=conn, node_id=node_id)
    if node is None:
        raise InvalidArgument("Node not found")
    return node
