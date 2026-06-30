# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from unittest.mock import AsyncMock

from stustapay.core.schema.tree import Node
from stustapay.core.service.webhook import WebhookService, WebhookType


async def test_get_webhook_url(
    webhook_service: WebhookService,
    event_admin_token: str,
    event_node: Node,
):
    url = await webhook_service.get_webhook_url(
        token=event_admin_token, node_id=event_node.id, webhook_type=WebhookType.pretix
    )

    assert url.startswith(f"{webhook_service.config.administration.base_url}/webhooks/hook?token=")
    assert len(url.split("token=", maxsplit=1)[1]) > 0


async def test_trigger_webhook_with_valid_token(
    webhook_service: WebhookService,
    event_admin_token: str,
    event_node: Node,
):
    webhook_service.pretix_provider.pretix_webhook = AsyncMock()  # type: ignore
    url = await webhook_service.get_webhook_url(
        token=event_admin_token, node_id=event_node.id, webhook_type=WebhookType.pretix
    )
    token = url.split("token=", maxsplit=1)[1]
    payload = {"action": "pretix.event.order.placed", "event": "test"}

    await webhook_service.trigger_webhook(token=token, payload=payload)

    webhook_service.pretix_provider.pretix_webhook.assert_awaited_once_with(node_id=event_node.id, payload=payload)


async def test_trigger_webhook_with_invalid_token(
    webhook_service: WebhookService,
):
    webhook_service.pretix_provider.pretix_webhook = AsyncMock()  # type: ignore

    await webhook_service.trigger_webhook(token="invalid-token", payload={"action": "test"})

    webhook_service.pretix_provider.pretix_webhook.assert_not_called()
