import enum
import logging

import asyncpg
from jose import JWTError, jwt
from pydantic import BaseModel, ValidationError
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.ticket_shop.pretix import PretixTicketProvider


class WebhookType(enum.Enum):
    pretix_order_update = "pretix_order_update"


class WebhookSecret(BaseModel):
    node_id: int
    webhook_type: WebhookType


class WebhookService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.pretix_provider = PretixTicketProvider(config=config, db_pool=db_pool)
        self.logger = logging.getLogger("webhooks")

    def _decode_webhook_jwt_secret(self, token: str) -> WebhookSecret | None:
        try:
            payload = jwt.decode(token, self.config.core.secret_key, algorithms=[self.config.core.jwt_token_algorithm])
            try:
                return WebhookSecret.model_validate(payload)
            except ValidationError:
                return None
        except JWTError:
            return None

    def _encode_webhook_jwt_secret(self, token_metadata: WebhookSecret) -> str:
        to_encode = {"node_id": token_metadata.node_id, "webhook_type": token_metadata.webhook_type.name}
        return jwt.encode(to_encode, self.config.core.secret_key, algorithm=self.config.core.jwt_token_algorithm)

    async def pretix_order_update(self, payload: WebhookSecret):
        await self.pretix_provider.synchronize_tickets_for_node(node_id=payload.node_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.ticket], event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_webhook_url(self, node: Node, webhook_type: WebhookType) -> str:
        secret = self._encode_webhook_jwt_secret(
            token_metadata=WebhookSecret(node_id=node.id, webhook_type=webhook_type)
        )
        # IMPORTANT: keep in sync with `stustapay.administration.routers.webhooks.py`
        full_url = f"{self.config.administration.base_url}/webhooks/hook?token={secret}"
        return full_url

    async def trigger_webhook(self, token: str):
        decoded = self._decode_webhook_jwt_secret(token)
        if decoded is None:
            self.logger.info("received invalid webhook event")
            return

        self.logger.debug(f"Received webhook: {decoded.webhook_type} for node_id: {decoded.node_id}")
        if decoded.webhook_type == WebhookType.pretix_order_update:
            await self.pretix_order_update(decoded)
