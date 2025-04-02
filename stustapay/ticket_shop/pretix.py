import asyncio
import enum
import logging
from datetime import datetime

import aiohttp
import asyncpg
from pydantic import BaseModel, ValidationError
from sftkit.database import Connection
from sftkit.error import ServiceException

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.tree.common import fetch_node, fetch_restricted_event_settings_for_node
from stustapay.ticket_shop.ticket_provider import CreateExternalTicket, ExternalTicketType, TicketProvider


class PretixError(ServiceException):
    id = "PretixError"

    def __init__(self, msg: str):
        self.msg = msg


class _PretixErrorFormat(BaseModel):
    code: str
    message: str | None = None
    error: str | None = None


class PretixListApiResponse(BaseModel):
    count: int
    results: list[dict]


class PretixOrderPosition(BaseModel):
    id: int
    positionid: int
    item: int
    secret: str


class PretixOrderStatus(enum.Enum):
    paid = "p"
    pending = "n"
    expired = "e"
    canceled = "c"


class PretixOrder(BaseModel):
    code: str
    event: str
    email: str
    positions: list[PretixOrderPosition]
    datetime: datetime
    status: PretixOrderStatus


class PretixWebhookPayload(BaseModel):
    notification_id: int
    organizer: str
    event: str
    action: str


class PretixOrderWebhookPayload(PretixWebhookPayload):
    code: str


class PretixApi:
    def __init__(self, base_url: str, organizer: str, event: str, api_key: str):
        self.organizer = organizer
        self.event = event
        self.api_key = api_key

        self.base_url = base_url
        self.api_base_url = f"{base_url}/api/v1/organizers/{organizer}/events/{event}"
        self.timeout = 30

    def _get_pretix_auth_headers(self) -> dict:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Token {self.api_key}",
        }

    async def _get(self, url: str, query: dict | None = None) -> dict:
        async with aiohttp.ClientSession(trust_env=True, headers=self._get_pretix_auth_headers()) as session:
            try:
                async with session.get(url, params=query, timeout=self.timeout) as response:
                    if not response.ok:
                        resp = await response.json()
                        err = _PretixErrorFormat.model_validate(resp)
                        raise PretixError(f"Pretix API returned an error: {err.code} - {err.message}")
                    # ignore content type as responses may be text/plain
                    return await response.json(content_type=None)
            except asyncio.TimeoutError as e:
                raise PretixError("Pretix API timeout") from e
            except Exception as e:  # pylint: disable=bare-except
                if isinstance(e, PretixError):
                    raise e
                raise PretixError("Pretix API returned an unknown error") from e

    async def fetch_orders(self) -> list[PretixOrder]:
        resp = await self._get(f"{self.api_base_url}/orders")
        validated_resp = PretixListApiResponse.model_validate(resp)
        orders = []
        for item in validated_resp.results:
            orders.append(PretixOrder.model_validate(item))
        return orders

    async def fetch_order(self, order_code: str) -> PretixOrder | None:
        resp = await self._get(f"{self.api_base_url}/orders/{order_code}")
        return PretixOrder.model_validate(resp)

    def get_link_to_order(self, order_code: str) -> str:
        return f"{self.base_url}/control/event/{self.organizer}/{self.event}/orders/{order_code}"

    @classmethod
    def from_event(cls, event_settings: RestrictedEventSettings):
        assert event_settings.pretix_presale_enabled
        assert event_settings.pretix_shop_url is not None
        assert event_settings.pretix_api_key is not None
        assert event_settings.pretix_organizer is not None
        assert event_settings.pretix_event is not None
        assert event_settings.pretix_ticket_ids is not None
        return cls(
            base_url=event_settings.pretix_shop_url,
            api_key=event_settings.pretix_api_key,
            organizer=event_settings.pretix_organizer,
            event=event_settings.pretix_event,
        )


class PretixTicketProvider(TicketProvider):
    def __init__(self, config: Config, db_pool: asyncpg.Pool):
        super().__init__(config, db_pool)
        self.logger = logging.getLogger("pretix_ticket_provider")

    async def _synchronizie_pretix_order(
        self, conn: Connection, node: Node, api: PretixApi, event_settings: RestrictedEventSettings, order: PretixOrder
    ):
        if order.status != PretixOrderStatus.paid:
            self.logger.debug(
                f"Skipped importing ticket from pretix order {order.code} as order has status {order.status.name}"
            )
            return

        assert event_settings.pretix_ticket_ids is not None
        pretix_ticket_product_ids = event_settings.pretix_ticket_ids
        async with conn.transaction(isolation="serializable"):
            for position in order.positions:
                if position.item in pretix_ticket_product_ids:
                    imported = await self.store_external_ticket(
                        conn=conn,
                        node=node,
                        ticket=CreateExternalTicket(
                            external_reference=order.code,
                            created_at=order.datetime,
                            token=position.secret,
                            ticket_type=ExternalTicketType.pretix,
                            external_link=api.get_link_to_order(order.code),
                        ),
                    )
                    if imported:
                        self.logger.debug(f"Imported ticket from pretix order {order.code}")

    async def _synchronize_tickets_for_node(
        self, conn: Connection, node: Node, event_settings: RestrictedEventSettings
    ):
        api = PretixApi.from_event(event_settings)
        orders = await api.fetch_orders()
        for order in orders:
            await self._synchronizie_pretix_order(
                conn=conn, node=node, api=api, event_settings=event_settings, order=order
            )

    async def synchronize_tickets(self):
        pretix_enabled = self.config.core.pretix_enabled
        if not pretix_enabled:
            self.logger.info(
                "Pretix integration is disabled for this SSP instance, disabling pretix ticket synchronization"
            )
            return

        self.logger.info("Staring periodic job to synchronize pretix tickets")
        while True:
            try:
                async with self.db_pool.acquire() as conn:
                    relevant_node_ids = await conn.fetchval(
                        "select array_agg(n.id) from node n join event e on n.event_id = e.id where e.pretix_presale_enabled"
                    )

                    for relevant_node_id in relevant_node_ids:
                        node = await fetch_node(conn=conn, node_id=relevant_node_id)
                        assert node is not None
                        settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
                        self.logger.debug(f"Synchronizing pretix tickets for event {node.name}")
                        await self._synchronize_tickets_for_node(conn=conn, node=node, event_settings=settings)
            except Exception:
                self.logger.exception("process pending orders threw an error")

            await asyncio.sleep(self.config.core.pretix_synchronization_interval.seconds)

    async def _handle_pretix_order_paid_webhook(self, node_id: int, payload: PretixOrderWebhookPayload):
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None
            settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
            if not settings.pretix_presale_enabled:
                self.logger.warning(
                    f"Skipping pretix ticket synchronization for event {node.name} as pretix presale is disabled"
                )
                return
            if settings.pretix_event != payload.event:
                self.logger.warning(
                    f"Received pretix webhook for event {node.name} for a different pretix organizer than was configured in the event"
                )
                return
            if settings.pretix_organizer != payload.organizer:
                self.logger.warning(
                    f"Received pretix webhook for event {node.name} for a different pretix event than was configured in the event"
                )
                return

            api = PretixApi.from_event(settings)
            order = await api.fetch_order(order_code=payload.code)
            await self._synchronizie_pretix_order(conn=conn, node=node, api=api, event_settings=settings, order=order)

    async def pretix_webhook(self, node_id: int, payload: dict):
        try:
            validated = PretixWebhookPayload.model_validate(payload)

            if validated.action == "pretix.event.order.paid":
                try:
                    order_payload = PretixOrderWebhookPayload.model_validate(payload)
                    await self._handle_pretix_order_paid_webhook(node_id=node_id, payload=order_payload)
                except ValidationError:
                    return
        except ValidationError:
            self.logger.info("Received invalid webhook payload from pretix")
            return


async def check_connection(event_settings: RestrictedEventSettings):
    api = PretixApi.from_event(event_settings)
    await api.fetch_orders()
