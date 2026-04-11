import pytest

from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, NewNode
from stustapay.core.service.tree.service import create_event, create_node
from stustapay.festivalsimulator.common import (
    DEFAULT_SIMULATOR_EVENT_NAME,
    SIMULATOR_ROOT_NODE_NAME,
    SimulatorEvent,
    fetch_simulator_events,
    get_simulator_event_name,
)


def test_get_simulator_event_name_single_event():
    assert get_simulator_event_name(0, 1) == DEFAULT_SIMULATOR_EVENT_NAME


def test_get_simulator_event_name_multiple_events():
    assert get_simulator_event_name(0, 2) == f"{DEFAULT_SIMULATOR_EVENT_NAME} 1"
    assert get_simulator_event_name(1, 2) == f"{DEFAULT_SIMULATOR_EVENT_NAME} 2"


@pytest.mark.parametrize(
    ("index", "total_events"),
    [
        (-1, 1),
        (0, 0),
        (1, 1),
    ],
)
def test_get_simulator_event_name_rejects_invalid_indices(index: int, total_events: int):
    with pytest.raises(ValueError):
        get_simulator_event_name(index, total_events)


async def test_fetch_simulator_events_returns_only_simulator_events(db_connection):
    simulator_root = await create_node(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        new_node=NewNode(name=SIMULATOR_ROOT_NODE_NAME, description=""),
    )
    first_event = await create_event(
        conn=db_connection,
        parent_id=simulator_root.id,
        event=NewEvent(
            name="Simulator A",
            description="",
            customer_portal_url="http://localhost:4300",
            customer_portal_contact_email="test@test.support.test.com",
            customer_portal_about_page_url="",
            customer_portal_data_privacy_url="",
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
            sumup_affiliate_key="test_affiliate",
            sumup_api_key="test_api_key",
            sumup_merchant_code="TEST_MERCHANT",
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
        ),
    )
    second_event = await create_event(
        conn=db_connection,
        parent_id=simulator_root.id,
        event=NewEvent(
            name="Simulator B",
            description="",
            customer_portal_url="http://localhost:4300",
            customer_portal_contact_email="test@test.support.test.com",
            customer_portal_about_page_url="",
            customer_portal_data_privacy_url="",
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
            sumup_affiliate_key="test_affiliate",
            sumup_api_key="test_api_key",
            sumup_merchant_code="TEST_MERCHANT",
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
        ),
    )
    await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=NewEvent(
            name="Outside Simulator",
            description="",
            customer_portal_url="http://localhost:4300",
            customer_portal_contact_email="test@test.support.test.com",
            customer_portal_about_page_url="",
            customer_portal_data_privacy_url="",
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
            sumup_affiliate_key="test_affiliate",
            sumup_api_key="test_api_key",
            sumup_merchant_code="TEST_MERCHANT",
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
        ),
    )

    events = await fetch_simulator_events(db_connection)

    assert events == [
        SimulatorEvent(node_id=first_event.id, name="Simulator A"),
        SimulatorEvent(node_id=second_event.id, name="Simulator B"),
    ]
