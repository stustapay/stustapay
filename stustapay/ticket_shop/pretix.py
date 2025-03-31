import asyncio
import logging
from datetime import datetime

import aiohttp
import asyncpg
from pydantic import BaseModel
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


class PretixOrder(BaseModel):
    code: str
    event: str
    email: str
    positions: list[PretixOrderPosition]
    datetime: datetime


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

    async def _synchronize_tickets_for_node(self, conn: Connection, node: Node):
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        api = PretixApi.from_event(event_settings)
        assert event_settings.pretix_ticket_ids is not None
        pretix_ticket_product_ids = event_settings.pretix_ticket_ids
        orders = await api.fetch_orders()
        for order in orders:
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

    async def synchronize_tickets_for_node(self, node_id: int):
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None
            settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
            if not settings.pretix_presale_enabled:
                self.logger.warning(
                    f"Skipping pretix ticket synchronization for event {node.name} as pretix presale is disabled"
                )
                return
            self.logger.debug(f"Synchronizing pretix tickets for event {node.name}")
            await self._synchronize_tickets_for_node(conn=conn, node=node)

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
                        self.logger.debug(f"Synchronizing pretix tickets for event {node.name}")
                        await self._synchronize_tickets_for_node(conn=conn, node=node)
            except Exception:
                self.logger.exception("process pending orders threw an error")

            await asyncio.sleep(self.config.core.pretix_synchronization_interval.seconds)


async def check_connection(event_settings: RestrictedEventSettings):
    api = PretixApi.from_event(event_settings)
    await api.fetch_orders()
