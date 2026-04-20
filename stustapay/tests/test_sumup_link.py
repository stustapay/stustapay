# pylint: disable=missing-kwoa,unexpected-keyword-arg,no-value-for-parameter
from datetime import datetime, timedelta, timezone

import pytest
from sftkit.database import Connection

from stustapay.core.schema.sumup import SumUpConnectionSource
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, NewNode, Node
from stustapay.core.service.sumup_link import create_sumup_api_for_node
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node
from stustapay.core.service.tree.service import TreeService
from stustapay.payment.sumup.api import SumUpMerchantProfile, SumUpOAuthToken


GLOBAL_SUMUP_CONFIG_KEYS = (
    "sumup.affiliate_key",
    "sumup.oauth_client_id",
    "sumup.oauth_client_secret",
)


@pytest.fixture(autouse=True)
async def restore_global_sumup_config(db_connection: Connection):
    rows = await db_connection.fetch("select key, value from config where key = any($1)", list(GLOBAL_SUMUP_CONFIG_KEYS))
    original_values = {row["key"]: row["value"] for row in rows}

    yield

    for key in GLOBAL_SUMUP_CONFIG_KEYS:
        if key in original_values:
            await db_connection.execute(
                "insert into config (key, value, node_id) values ($1, $2, $3) "
                "on conflict (key) do update set value = excluded.value",
                key,
                original_values[key],
                ROOT_NODE_ID,
            )
        else:
            await db_connection.execute("delete from config where key = $1", key)


async def _set_global_sumup_config(conn: Connection):
    for key, value in zip(
        GLOBAL_SUMUP_CONFIG_KEYS,
        ("sup_afk_global", "sumup-client-id", "sumup-client-secret"),
        strict=True,
    ):
        await conn.execute(
            "insert into config (key, value, node_id) values ($1, $2, $3) "
            "on conflict (key) do update set value = excluded.value",
            key,
            value,
            ROOT_NODE_ID,
        )


async def _copy_event_under_parent(conn: Connection, tree_service: TreeService, token: str, template_event_node: Node, parent_id: int) -> Node:
    template = await fetch_restricted_event_settings_for_node(conn=conn, node_id=template_event_node.id)
    return await tree_service.create_event(
        token=token,
        node_id=parent_id,
        event=NewEvent(
            name=f"{template_event_node.name}-child",
            description=template_event_node.description,
            **template.model_dump(exclude={"id", "languages", "sumup_oauth_refresh_token"}),
        ),
    )


async def test_create_sumup_api_for_node_prefers_parent_link(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    event_node: Node,
    monkeypatch,
):
    parent = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(name="Organizer", description=""),
    )
    scoped_event = await _copy_event_under_parent(db_connection, tree_service, global_admin_token, event_node, parent.id)
    await _set_global_sumup_config(db_connection)
    await db_connection.execute(
        "insert into node_sumup_link (node_id, merchant_code, merchant_name, refresh_token) values ($1, $2, $3, $4)",
        parent.id,
        "NODE-MERCHANT",
        "Node Merchant",
        "node-refresh-token",
    )

    async def fake_fetch_new_oauth_token(client_id: str, client_secret: str, refresh_token: str):
        assert client_id == "sumup-client-id"
        assert client_secret == "sumup-client-secret"
        assert refresh_token == "node-refresh-token"
        return SumUpOAuthToken(
            access_token="oauth-access-token",
            refresh_token=refresh_token,
            expires_in=3600,
            token_type="bearer",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )

    monkeypatch.setattr("stustapay.core.service.sumup_link.fetch_new_oauth_token", fake_fetch_new_oauth_token)

    resolved = await create_sumup_api_for_node(conn=db_connection, node_id=scoped_event.id)

    assert resolved is not None
    api, access = resolved
    assert api.api_key == "oauth-access-token"
    assert api.merchant_code == "NODE-MERCHANT"
    assert access.source == SumUpConnectionSource.node_link
    assert access.source_node_id == parent.id
    assert access.affiliate_key == "sup_afk_global"


async def test_create_sumup_api_for_node_falls_back_to_legacy_event_api_key(
    db_connection: Connection,
    event_node: Node,
):
    resolved = await create_sumup_api_for_node(conn=db_connection, node_id=event_node.id)

    assert resolved is not None
    api, access = resolved
    assert api.api_key == "test_api_key"
    assert api.merchant_code == "TEST_MERCHANT"
    assert access.source == SumUpConnectionSource.legacy_event_api_key
    assert access.source_node_id == event_node.id


async def test_sumup_auth_code_flow_saves_link_on_non_event_node(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    monkeypatch,
):
    parent = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(name="Tenant", description=""),
    )
    await _set_global_sumup_config(db_connection)

    async def fake_fetch_refresh_token_from_auth_code(
        client_id: str, client_secret: str, authorization_code: str, redirect_uri: str | None = None
    ):
        assert client_id == "sumup-client-id"
        assert client_secret == "sumup-client-secret"
        assert authorization_code == "auth-code"
        assert redirect_uri == "https://admin.example.test/sumup/oauth/callback"
        return SumUpOAuthToken(
            access_token="access-token",
            refresh_token="refresh-token",
            expires_in=3600,
            token_type="bearer",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )

    async def fake_fetch_merchant_profile(access_token: str):
        assert access_token == "access-token"
        return SumUpMerchantProfile(merchant_code="SUMUP-MERCHANT", company_name="Tenant Merchant")

    monkeypatch.setattr(
        "stustapay.core.service.tree.service.fetch_refresh_token_from_auth_code", fake_fetch_refresh_token_from_auth_code
    )
    monkeypatch.setattr("stustapay.core.service.tree.service.fetch_merchant_profile", fake_fetch_merchant_profile)

    status = await tree_service.sumup_auth_code_flow(
        token=global_admin_token,
        node_id=parent.id,
        authorization_code="auth-code",
        redirect_uri="https://admin.example.test/sumup/oauth/callback",
    )

    assert status.connected is True
    assert status.node_id == parent.id
    assert status.merchant_code == "SUMUP-MERCHANT"
    assert status.merchant_name == "Tenant Merchant"
    assert await db_connection.fetchval("select merchant_code from node_sumup_link where node_id = $1", parent.id) == "SUMUP-MERCHANT"


async def test_get_restricted_event_settings_reports_resolved_node_link(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    event_node: Node,
):
    parent = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(name="Organizer", description=""),
    )
    scoped_event = await _copy_event_under_parent(db_connection, tree_service, global_admin_token, event_node, parent.id)
    await _set_global_sumup_config(db_connection)
    await db_connection.execute(
        "insert into node_sumup_link (node_id, merchant_code, merchant_name, refresh_token) values ($1, $2, $3, $4)",
        parent.id,
        "NODE-MERCHANT",
        "Node Merchant",
        "node-refresh-token",
    )

    settings = await tree_service.get_restricted_event_settings(token=global_admin_token, node_id=scoped_event.id)

    assert settings.resolved_sumup_link is not None
    assert settings.resolved_sumup_link.source == SumUpConnectionSource.node_link
    assert settings.resolved_sumup_link.source_node_id == parent.id
    assert settings.resolved_sumup_link.merchant_code == "NODE-MERCHANT"
    assert settings.sumup_global_oauth_configured is True
    assert settings.sumup_global_affiliate_key_configured is True


async def test_clear_legacy_sumup_settings_removes_event_credentials_and_keeps_parent_link(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    event_node: Node,
):
    parent = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(name="Organizer", description=""),
    )
    scoped_event = await _copy_event_under_parent(db_connection, tree_service, global_admin_token, event_node, parent.id)
    await _set_global_sumup_config(db_connection)
    await db_connection.execute(
        "insert into node_sumup_link (node_id, merchant_code, merchant_name, refresh_token) values ($1, $2, $3, $4)",
        parent.id,
        "NODE-MERCHANT",
        "Node Merchant",
        "node-refresh-token",
    )
    await db_connection.execute(
        "update event set "
        "sumup_api_key = $1, "
        "sumup_affiliate_key = $2, "
        "sumup_merchant_code = $3, "
        "sumup_oauth_client_id = $4, "
        "sumup_oauth_client_secret = $5, "
        "sumup_oauth_refresh_token = $6 "
        "where id = (select event_id from node where id = $7)",
        "legacy-api-key",
        "legacy-affiliate",
        "LEGACY-MERCHANT",
        "legacy-client-id",
        "legacy-client-secret",
        "legacy-refresh-token",
        scoped_event.id,
    )

    settings = await tree_service.clear_legacy_sumup_settings(token=global_admin_token, node_id=scoped_event.id)

    assert settings.sumup_api_key == ""
    assert settings.sumup_affiliate_key == ""
    assert settings.sumup_merchant_code == ""
    assert settings.sumup_oauth_client_id == ""
    assert settings.sumup_oauth_client_secret == ""
    assert settings.sumup_oauth_refresh_token == ""
    assert settings.sumup_legacy_api_key_configured is False
    assert settings.sumup_legacy_oauth_configured is False
    assert settings.resolved_sumup_link is not None
    assert settings.resolved_sumup_link.source == SumUpConnectionSource.node_link
    assert settings.resolved_sumup_link.source_node_id == parent.id
