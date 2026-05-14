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
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.ticket_shop.ticket_provider import (
    CreateExternalTicket,
    ExternalTicketType,
    TicketProvider,
)


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
    next: str | None = None
    results: list[dict]


class PretixOrderPosition(BaseModel):
    id: int
    positionid: int
    item: int
    secret: str
    attendee_email: str | None = None
    attendee_name: str | None = None
    addon_to: int | None = None
    price: str | None = None


class PretixOrderStatus(enum.Enum):
    paid = "p"
    pending = "n"
    expired = "e"
    canceled = "c"


class PretixProduct(BaseModel):
    id: int
    name: dict[str, str]
    default_price: float


class PretixInvoiceAddress(BaseModel):
    name: str | None = None
    company: str | None = None


class PretixOrder(BaseModel):
    code: str
    event: str
    email: str
    positions: list[PretixOrderPosition]
    datetime: datetime
    status: PretixOrderStatus
    invoice_address: PretixInvoiceAddress | None = None


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

    async def _request(
        self,
        method: str,
        url: str,
        query: dict | None = None,
        json_data: dict | None = None,
    ) -> dict:
        async with aiohttp.ClientSession(trust_env=True, headers=self._get_pretix_auth_headers()) as session:
            try:
                async with session.request(method, url, params=query, json=json_data, timeout=self.timeout) as response:
                    if not response.ok:
                        resp = await response.json()
                        err = _PretixErrorFormat.model_validate(resp)
                        raise PretixError(
                            f"Pretix API returned an error: {err.code} - {err.message or 'Unknown error'}"
                        )
                    return await response.json(content_type=None)
            except asyncio.TimeoutError as e:
                raise PretixError("Pretix API timeout") from e
            except Exception as e:  # pylint: disable=broad-except
                if isinstance(e, PretixError):
                    raise e
                raise PretixError("Pretix API returned an unknown error") from e

    async def _get(self, url: str, query: dict | None = None) -> dict:
        return await self._request("GET", url, query=query)

    async def _post(self, url: str, json_data: dict | None = None) -> dict:
        return await self._request("POST", url, json_data=json_data)

    async def _fetch_all_pages(self, url: str) -> list[dict]:
        """Fetch all pages of a paginated Pretix API response."""
        all_results: list[dict] = []
        current_url: str | None = url
        while current_url is not None:
            resp = await self._get(current_url)
            validated_resp = PretixListApiResponse.model_validate(resp)
            all_results.extend(validated_resp.results)
            current_url = validated_resp.next
        return all_results

    async def fetch_products(self) -> list[PretixProduct]:
        results = await self._fetch_all_pages(f"{self.api_base_url}/items")
        return [PretixProduct.model_validate(item) for item in results]

    async def fetch_orders(self) -> list[PretixOrder]:
        results = await self._fetch_all_pages(f"{self.api_base_url}/orders")
        return [PretixOrder.model_validate(item) for item in results]

    async def fetch_order(self, order_code: str) -> PretixOrder | None:
        resp = await self._get(f"{self.api_base_url}/orders/{order_code}")
        return PretixOrder.model_validate(resp)

    async def fetch_checkin_lists(self) -> list[dict]:
        resp = await self._get(f"{self.api_base_url}/checkinlists")
        validated_resp = PretixListApiResponse.model_validate(resp)
        return validated_resp.results

    async def redeem_checkin(self, checkin_list_id: int, secret: str) -> bool:
        """Mark a ticket as checked in via the Pretix checkin API."""
        try:
            await self._post(
                f"{self.api_base_url}/checkinlists/{checkin_list_id}/positions/{secret}/redeem/",
                json_data={"force": False, "nonce": None},
            )
            return True
        except PretixError:
            return False

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

    def _compute_topup_for_ticket(
        self,
        order: PretixOrder,
        ticket_position: PretixOrderPosition,
        pretix_topup_ids: list[int],
    ) -> float:
        """Compute the total top-up amount for a ticket position by summing up
        all add-on positions that reference this ticket and are top-up products."""
        total_topup = 0.0
        for position in order.positions:
            if position.item in pretix_topup_ids and position.addon_to == ticket_position.id:
                try:
                    total_topup += float(position.price) if position.price else 0.0
                except (ValueError, TypeError):
                    pass
        return total_topup

    def _resolve_customer_email(self, order: PretixOrder, position: PretixOrderPosition) -> str | None:
        """Resolve customer email: prefer attendee_email on position, fall back to order email."""
        if position.attendee_email:
            return position.attendee_email
        if order.email:
            return order.email
        return None

    def _resolve_customer_name(self, order: PretixOrder, position: PretixOrderPosition) -> str | None:
        """Resolve customer name: prefer attendee_name, fall back to invoice address name."""
        if position.attendee_name:
            return position.attendee_name
        if order.invoice_address and order.invoice_address.name:
            return order.invoice_address.name
        return None

    async def _synchronize_pretix_order(
        self,
        conn: Connection,
        node: Node,
        api: PretixApi,
        event_settings: RestrictedEventSettings,
        order: PretixOrder,
        product_names: dict[int, str] | None = None,
    ):
        if order.status != PretixOrderStatus.paid:
            self.logger.debug(
                f"Skipped importing ticket from pretix order {order.code} as order has status {order.status.name}"
            )
            return

        assert event_settings.pretix_ticket_ids is not None
        pretix_ticket_product_ids = event_settings.pretix_ticket_ids
        pretix_topup_ids = event_settings.pretix_topup_ids or []

        async with conn.transaction(isolation="serializable"):
            for position in order.positions:
                if position.item in pretix_ticket_product_ids:
                    # Compute top-up amount from add-on positions linked to this ticket
                    topup_amount = self._compute_topup_for_ticket(order, position, pretix_topup_ids)

                    customer_email = self._resolve_customer_email(order, position)
                    customer_name = self._resolve_customer_name(order, position)

                    pretix_product_name = (product_names or {}).get(position.item)

                    imported = await self.store_external_ticket(
                        conn=conn,
                        node=node,
                        ticket=CreateExternalTicket(
                            external_reference=order.code,
                            created_at=order.datetime,
                            token=position.secret,
                            ticket_type=ExternalTicketType.pretix,
                            external_link=api.get_link_to_order(order.code),
                            customer_email=customer_email,
                            customer_name=customer_name,
                            initial_top_up_amount=topup_amount,
                            pretix_item_id=position.item,
                            pretix_product_name=pretix_product_name,
                        ),
                    )
                    if imported:
                        self.logger.info(
                            f"Imported ticket from pretix order {order.code} "
                            f"(item={position.item}, topup={topup_amount:.2f})"
                        )

    async def _synchronize_tickets_for_node(
        self, conn: Connection, node: Node, event_settings: RestrictedEventSettings
    ):
        api = PretixApi.from_event(event_settings)

        # Build product name lookup
        products = await api.fetch_products()
        product_names: dict[int, str] = {}
        for p in products:
            name = next(iter(p.name.values()), "")
            product_names[p.id] = name

        orders = await api.fetch_orders()
        for order in orders:
            await self._synchronize_pretix_order(
                conn=conn,
                node=node,
                api=api,
                event_settings=event_settings,
                order=order,
                product_names=product_names,
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

                    if not relevant_node_ids:
                        self.logger.debug("No pretix-enabled events found, skipping sync")
                        await asyncio.sleep(self.config.core.pretix_synchronization_interval.seconds)
                        continue

                    for relevant_node_id in relevant_node_ids:
                        node = await fetch_node(conn=conn, node_id=relevant_node_id)
                        assert node is not None
                        settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
                        self.logger.debug(f"Synchronizing pretix tickets for event {node.name}")
                        await self._synchronize_tickets_for_node(conn=conn, node=node, event_settings=settings)
                        await self._sync_pending_checkins(conn=conn, node=node, event_settings=settings)
            except Exception:
                self.logger.exception("process pending orders threw an error")

            await asyncio.sleep(self.config.core.pretix_synchronization_interval.seconds)

    async def _sync_pending_checkins(self, conn: Connection, node: Node, event_settings: RestrictedEventSettings):
        """Sync pending checkins to Pretix (NFC band was assigned in StuStaPay)."""
        pending = await conn.fetch(
            "select id, token from ticket_voucher where node_id = $1 and needs_pretix_checkin = true and not cancelled",
            node.event_node_id,
        )
        if not pending:
            return

        api = PretixApi.from_event(event_settings)
        checkin_lists = await api.fetch_checkin_lists()
        if not checkin_lists:
            self.logger.warning(f"No checkin lists found for event {node.name}, cannot sync checkins to Pretix")
            return

        checkin_list_id = checkin_lists[0]["id"]

        for row in pending:
            success = await api.redeem_checkin(checkin_list_id, row["token"])
            if success:
                await conn.execute(
                    "update ticket_voucher set needs_pretix_checkin = false where id = $1",
                    row["id"],
                )
                self.logger.info(f"Synced checkin to Pretix for voucher {row['id']}")
            else:
                self.logger.warning(f"Failed to sync checkin to Pretix for voucher {row['id']}")

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
            products = await api.fetch_products()
            product_names = {p.id: next(iter(p.name.values()), "") for p in products}
            await self._synchronize_pretix_order(
                conn=conn,
                node=node,
                api=api,
                event_settings=settings,
                order=order,
                product_names=product_names,
            )

    async def _handle_pretix_order_canceled_webhook(self, node_id: int, payload: PretixOrderWebhookPayload):
        """Handle order cancellation: mark all vouchers for this order as cancelled."""
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None

            result = await conn.execute(
                "update ticket_voucher set cancelled = true "
                "where node_id = $1 and external_reference = $2 and not cancelled",
                node.event_node_id,
                payload.code,
            )
            self.logger.info(f"Cancelled vouchers for pretix order {payload.code} in event {node.name}: {result}")

    async def _handle_pretix_order_changed_webhook(self, node_id: int, payload: PretixOrderWebhookPayload):
        """Handle order changes: re-fetch order and update voucher data."""
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None
            settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
            if not settings.pretix_presale_enabled:
                return

            api = PretixApi.from_event(settings)
            order = await api.fetch_order(order_code=payload.code)

            if order.status == PretixOrderStatus.canceled:
                await conn.execute(
                    "update ticket_voucher set cancelled = true "
                    "where node_id = $1 and external_reference = $2 and not cancelled",
                    node.event_node_id,
                    payload.code,
                )
                self.logger.info(f"Order {payload.code} was changed to cancelled status")
                return

            if order.status == PretixOrderStatus.paid:
                # Re-sync: import any new positions, update top-up amounts
                await self._synchronize_pretix_order(
                    conn=conn, node=node, api=api, event_settings=settings, order=order
                )
                self.logger.info(f"Re-synced changed pretix order {payload.code}")

    async def _handle_pretix_checkin_webhook(self, node_id: int, payload: PretixWebhookPayload):
        """Handle checkin from pretixSCAN: mark voucher as externally checked in."""
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None

            self.logger.info(
                f"Received checkin webhook for event {node.name} "
                f"(action={payload.action}) — will be processed in next sync cycle"
            )

    async def notify_pretix_checkin(self, node_id: int, voucher_token: str):
        """Notify Pretix that a ticket has been checked in (band assigned in StuStaPay).
        Called after NFC wristband assignment."""
        async with self.db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None
            settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node_id)
            if not settings.pretix_presale_enabled:
                return

            api = PretixApi.from_event(settings)

            # Find the first checkin list for this event
            checkin_lists = await api.fetch_checkin_lists()
            if not checkin_lists:
                self.logger.warning(f"No checkin lists found for event {node.name}, cannot sync checkin to Pretix")
                return

            checkin_list_id = checkin_lists[0]["id"]
            success = await api.redeem_checkin(checkin_list_id, voucher_token)
            if success:
                self.logger.info(f"Successfully synced checkin to Pretix for token {voucher_token[:8]}...")
            else:
                self.logger.warning(f"Failed to sync checkin to Pretix for token {voucher_token[:8]}...")

    async def pretix_webhook(self, node_id: int, payload: dict):
        try:
            validated = PretixWebhookPayload.model_validate(payload)

            if validated.action == "pretix.event.order.paid":
                try:
                    order_payload = PretixOrderWebhookPayload.model_validate(payload)
                    await self._handle_pretix_order_paid_webhook(node_id=node_id, payload=order_payload)
                except ValidationError:
                    return

            elif validated.action in (
                "pretix.event.order.canceled",
                "pretix.event.order.expired",
            ):
                try:
                    order_payload = PretixOrderWebhookPayload.model_validate(payload)
                    await self._handle_pretix_order_canceled_webhook(node_id=node_id, payload=order_payload)
                except ValidationError:
                    return

            elif validated.action == "pretix.event.order.changed":
                try:
                    order_payload = PretixOrderWebhookPayload.model_validate(payload)
                    await self._handle_pretix_order_changed_webhook(node_id=node_id, payload=order_payload)
                except ValidationError:
                    return

            elif validated.action == "pretix.event.checkin":
                await self._handle_pretix_checkin_webhook(node_id=node_id, payload=validated)

            else:
                self.logger.debug(f"Ignoring unhandled pretix webhook action: {validated.action}")

        except ValidationError:
            self.logger.info("Received invalid webhook payload from pretix")
            return


async def check_connection(event_settings: RestrictedEventSettings):
    api = PretixApi.from_event(event_settings)
    await api.fetch_orders()
