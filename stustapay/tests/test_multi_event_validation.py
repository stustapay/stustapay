from __future__ import annotations

import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent
from stustapay.core.service.tree.service import create_event
from stustapay.festivalsimulator.common import SimulatorEvent
from stustapay.festivalsimulator.festivalsimulator import run_all_simulators


def _new_event(name: str, customer_portal_url: str, merchant_code: str) -> NewEvent:
    return NewEvent(
        name=name,
        description="",
        customer_portal_url=customer_portal_url,
        customer_portal_contact_email="test@test.support.test.com",
        customer_portal_about_page_url=f"{customer_portal_url}/about",
        customer_portal_data_privacy_url=f"{customer_portal_url}/privacy",
        currency_identifier="EUR",
        sepa_enabled=True,
        sepa_sender_name="Event Foobar",
        sepa_description="foobar {user_tag_uid}",
        sepa_sender_iban="DE89370400440532013000",
        sepa_allowed_country_codes=["DE"],
        bon_title="",
        bon_issuer="",
        bon_address="",
        max_account_balance=150,
        sumup_topup_enabled=True,
        sumup_payment_enabled=True,
        sumup_affiliate_key="sup_afk_test_affiliate",
        sumup_api_key=f"test_api_key_{merchant_code}",
        sumup_merchant_code=merchant_code,
        ust_id="",
        email_enabled=False,
        email_default_sender=None,
        email_smtp_host=None,
        email_smtp_port=None,
        email_smtp_username=None,
        email_smtp_password=None,
        payout_done_subject="[StuStaPay] Payout Completed",
        payout_done_message="done",
        payout_registered_subject="[StuStaPay] Registered for Payout",
        payout_registered_message="registered",
        payout_sender=None,
        pretix_presale_enabled=False,
        pretix_api_key=None,
        pretix_event=None,
        pretix_organizer=None,
        pretix_shop_url=None,
        pretix_ticket_ids=None,
    )


async def test_run_all_simulators_launches_every_discovered_event(config, monkeypatch: pytest.MonkeyPatch):
    events = [
        SimulatorEvent(node_id=11, name="Event 1"),
        SimulatorEvent(node_id=12, name="Event 2"),
        SimulatorEvent(node_id=13, name="Event 3"),
    ]
    seen: list[tuple[int, str, float]] = []

    class FakeAcquire:
        async def __aenter__(self):
            return object()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class FakePool:
        def acquire(self):
            return FakeAcquire()

        async def close(self):
            return None

    class FakeDatabase:
        async def create_pool(self, n_connections=1):
            assert n_connections == 1
            return FakePool()

    async def fake_fetch_simulator_events(_conn):
        return events

    async def fake_run(self):
        seen.append((self.event_node_id, self.event_name, self.bookings_per_second))

    monkeypatch.setattr(
        "stustapay.festivalsimulator.festivalsimulator.get_database",
        lambda _config: FakeDatabase(),
    )
    monkeypatch.setattr(
        "stustapay.festivalsimulator.festivalsimulator.fetch_simulator_events",
        fake_fetch_simulator_events,
    )
    monkeypatch.setattr(
        "stustapay.festivalsimulator.festivalsimulator.Simulator.run",
        fake_run,
    )

    await run_all_simulators(config=config, bookings_per_second=77.0)

    assert sorted(seen) == [
        (11, "Event 1", 77.0),
        (12, "Event 2", 77.0),
        (13, "Event 3", 77.0),
    ]


async def test_customer_portal_config_resolves_multiple_events_by_base_url(
    customer_service,
    db_connection: Connection,
):
    event_a = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_event("Portal A", "http://portal-a.local", "PORTAL_A"),
    )
    event_b = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_event("Portal B", "http://portal-b.local", "PORTAL_B"),
    )
    event_c = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_event("Portal C", "http://portal-c.local", "PORTAL_C"),
    )

    config_a = await customer_service.get_api_config(base_url="http://portal-a.local")
    config_b = await customer_service.get_api_config(base_url="http://portal-b.local")
    config_c = await customer_service.get_api_config(base_url="http://portal-c.local")

    assert (config_a.node_id, config_a.event_name) == (event_a.id, "Portal A")
    assert (config_b.node_id, config_b.event_name) == (event_b.id, "Portal B")
    assert (config_c.node_id, config_c.event_name) == (event_c.id, "Portal C")
