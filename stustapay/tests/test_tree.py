# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,no-value-for-parameter
import secrets

import pytest
from asyncpg import RaiseError
from pydantic import ValidationError
from sftkit.database import Connection

from stustapay.core.schema.language import Language
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.terminal import NewTerminal, TerminalMode
from stustapay.core.schema.ticket import NewTicket
from stustapay.core.schema.till import NewTill, NewTillButton, NewTillLayout, NewTillProfile
from stustapay.core.schema.tree import (
    ROOT_NODE_ID,
    CopyEventOptions,
    CopyEventRequest,
    NewEvent,
    NewNode,
    Node,
    ObjectType,
    UpdateEvent,
)
from stustapay.core.service.tree.common import fetch_node, fetch_restricted_event_settings_for_node
from stustapay.core.service.tree.service import TreeService
from stustapay.tests.common import list_equals

TEST_BANNER_BYTES = b"not-a-real-png-but-good-enough-for-copy-tests"


def _unique_customer_portal_url() -> str:
    return f"https://pay.stustapay.example/{secrets.token_hex(8)}"


def _build_source_event(name: str = "Original Event", description: str = "Event to be copied") -> NewEvent:
    customer_portal_url = _unique_customer_portal_url()
    return NewEvent(
        name=name,
        description=description,
        currency_identifier="CHF",
        sumup_topup_enabled=True,
        group_topup_enabled=True,
        sumup_payment_enabled=True,
        max_account_balance=123.45,
        vip_max_account_balance=456.78,
        start_date="2026-08-01T10:00:00+00:00",
        end_date="2026-08-03T23:00:00+00:00",
        daily_end_time="04:30:00",
        expected_visitors_per_day=3210,
        post_payment_allowed=True,
        customer_portal_url=customer_portal_url,
        customer_portal_about_page_url=f"{customer_portal_url}/about",
        customer_portal_data_privacy_url=f"{customer_portal_url}/privacy",
        customer_portal_contact_email="ops@test.com",
        ust_id="UST-42",
        bon_issuer="StuStaPay Org",
        bon_address="Example Street 5",
        bon_title="Festival Receipt",
        sepa_enabled=True,
        sepa_description="Festival payout {user_tag_uid}",
        sepa_sender_iban="DE89370400440532013000",
        sepa_allowed_country_codes=["DE", "AT"],
        sepa_sender_name="Festival Org",
        sepa_max_num_payouts_in_run=222,
        email_enabled=True,
        email_default_sender="festival@test.com",
        email_smtp_host="smtp.test.local",
        email_smtp_port=2525,
        email_smtp_username="festival-user",
        email_smtp_password="smtp-secret",
        payout_done_subject="Done subject",
        payout_done_message="Done message",
        payout_registered_subject="Registered subject",
        payout_registered_message="Registered message",
        payout_sender="Festival Team",
        pretix_presale_enabled=True,
        pretix_api_key="pretix-secret",
        pretix_event="festival-2026",
        pretix_organizer="stustapay",
        pretix_shop_url="https://pretix.example/shop",
        pretix_ticket_ids=[101, 202],
        donation_enabled=False,
        customer_portal_primary_color="#112233",
        customer_portal_secondary_color="#445566",
        customer_portal_background_color="#ddeeff",
        translation_texts={
            Language.en_US: {"welcome": "Welcome", "faq": "Questions"},
            Language.de_DE: {"welcome": "Willkommen", "faq": "Fragen"},
        },
        sumup_api_key="sumup-api-secret",
        sumup_affiliate_key="sumup-affiliate-secret",
        sumup_merchant_code="SUMUP-MERCHANT",
        sumup_oauth_client_id="sumup-client-id",
        sumup_oauth_client_secret="sumup-client-secret",
        wifi_ssid="festival-wifi",
        wifi_passphrase="super-secret-passphrase",
    )


async def _event_id_for_node(conn: Connection, node_id: int) -> int:
    event_id = await conn.fetchval("select event_id from node where id = $1", node_id)
    assert event_id is not None
    return event_id


async def _fetch_node_id_by_parent_and_name(conn: Connection, parent_id: int, name: str) -> int:
    node_id = await conn.fetchval("select id from node where parent = $1 and name = $2", parent_id, name)
    assert node_id is not None
    return node_id


async def _insert_user_tag_secret(conn: Connection, node_id: int, description: str = "source secret") -> int:
    secret_id = await conn.fetchval(
        "insert into user_tag_secret (node_id, key0, key1, description) values ($1, $2, $3, $4) returning id",
        node_id,
        bytes.fromhex("00112233445566778899aabbccddeeff"),
        bytes.fromhex("ffeeddccbbaa99887766554433221100"),
        description,
    )
    assert secret_id is not None
    return secret_id


async def _fetch_product_id(conn: Connection, node_id: int, name: str) -> int:
    product_id = await conn.fetchval("select id from product where node_id = $1 and name = $2", node_id, name)
    assert product_id is not None
    return product_id


async def _fetch_user_id_by_description(conn: Connection, node_id: int, description: str) -> int:
    user_id = await conn.fetchval("select id from usr where node_id = $1 and description = $2", node_id, description)
    assert user_id is not None
    return user_id


async def test_node_creation(db_connection: Connection, tree_service: TreeService, global_admin_token: str):
    node: Node = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(
            name="Test node",
            description="",
        ),
    )
    assert f"/0/{node.id}" == node.path
    assert list_equals([ROOT_NODE_ID], node.parent_ids)
    assert ROOT_NODE_ID == node.parent

    root_node = await fetch_node(conn=db_connection, node_id=ROOT_NODE_ID)
    assert root_node is not None

    # the newly created child should appear as a child of the root node
    assert any([node.id == child.id for child in root_node.children])

    # we should not be able to add a second node with the same name under the newly created one
    with pytest.raises(RaiseError):
        await tree_service.create_node(
            token=global_admin_token,
            node_id=node.id,
            new_node=NewNode(
                name="Test node",
                description="",
            ),
        )


async def test_event_creation(tree_service: TreeService, global_admin_token: str):
    event_node: Node = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=NewEvent(
            name="Test event",
            description="",
            currency_identifier="EUR",
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            max_account_balance=100,
            customer_portal_url=_unique_customer_portal_url(),
            customer_portal_about_page_url="https://pay.stustapay.de/about",
            customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
            customer_portal_contact_email="test@test.com",
            ust_id="UST ID",
            bon_issuer="Issuer",
            bon_address="Address",
            bon_title="Title",
            sepa_enabled=False,
            sepa_description="",
            sepa_sender_iban="",
            sepa_allowed_country_codes=[],
            sepa_sender_name="",
            email_enabled=False,
            email_default_sender=None,
            email_smtp_host=None,
            email_smtp_port=None,
            email_smtp_username=None,
            email_smtp_password=None,
            payout_done_subject="[StuStaPay] Payout Completed",
            payout_done_message="Thank you for your patience. The payout process has been completed and the funds should arrive within the next days to your specified bank account.",
            payout_registered_subject="[StuStaPay] Registered for Payout",
            payout_registered_message="Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transferred to the specified bank account in our next manual payout. You will receive another email once we transferred the funds.",
            payout_sender=None,
            pretix_presale_enabled=False,
            pretix_api_key=None,
            pretix_event=None,
            pretix_organizer=None,
            pretix_shop_url=None,
            pretix_ticket_ids=None,
            wifi_ssid="festival-wifi",
            wifi_passphrase="secret1234",
        ),
    )
    assert event_node.event is not None
    assert f"/0/{event_node.id}" == event_node.path
    assert list_equals([0], event_node.parent_ids)
    assert 0 == event_node.parent
    assert event_node.event.group_topup_enabled is False

    child_node: Node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(
            name="Child node",
            description="",
        ),
    )
    assert child_node is not None

    with pytest.raises(Exception):
        await tree_service.create_event(
            token=global_admin_token,
            node_id=child_node.id,
            event=NewEvent(
                name="Invalid Node",
                description="",
                currency_identifier="EUR",
                sumup_topup_enabled=False,
                sumup_payment_enabled=False,
                max_account_balance=100,
                customer_portal_url=_unique_customer_portal_url(),
                customer_portal_about_page_url="https://pay.stustapay.de/about",
                customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
                customer_portal_contact_email="test@test.com",
                ust_id="UST ID",
                bon_issuer="Issuer",
                bon_address="Address",
                bon_title="Title",
                sepa_enabled=False,
                sepa_description="",
                sepa_sender_iban="",
                sepa_allowed_country_codes=[],
                sepa_sender_name="",
                email_enabled=False,
                email_default_sender=None,
                email_smtp_host=None,
                email_smtp_port=None,
                email_smtp_username=None,
                email_smtp_password=None,
                payout_done_subject="[StuStaPay] Payout Completed",
                payout_done_message="Thank you for your patience. The payout process has been completed and the funds should arrive within the next days to your specified bank account.",
                payout_registered_subject="[StuStaPay] Registered for Payout",
                payout_registered_message="Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transferred to the specified bank account in our next manual payout. You will receive another email once we transferred the funds.",
                payout_sender=None,
                pretix_presale_enabled=False,
                pretix_api_key=None,
                pretix_event=None,
                pretix_organizer=None,
                pretix_shop_url=None,
                pretix_ticket_ids=None,
            ),
        )


async def test_update_event_theme_colors(
    tree_service: TreeService, global_admin_token: str, event_node: Node, db_connection: Connection
):
    event_settings = await fetch_restricted_event_settings_for_node(conn=db_connection, node_id=event_node.id)
    updated_event = NewEvent(
        name=event_node.name,
        description=event_node.description,
        **event_settings.model_dump(exclude={"id", "languages", "sumup_oauth_refresh_token"}),
    )
    updated_event.customer_portal_primary_color = "#112233"
    updated_event.customer_portal_secondary_color = "#445566"
    updated_event.customer_portal_background_color = "#778899"

    updated_node = await tree_service.update_event(
        token=global_admin_token,
        node_id=event_node.id,
        event=updated_event,
    )

    assert updated_node.event is not None
    assert updated_node.event.customer_portal_primary_color == "#112233"
    assert updated_node.event.customer_portal_secondary_color == "#445566"
    assert updated_node.event.customer_portal_background_color == "#778899"


async def test_object_rules(tree_service: TreeService, global_admin_token: str):
    top_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(
            name="foobar",
            description="",
        ),
    )
    assert len(top_node.forbidden_objects_at_node) == 0
    assert len(top_node.forbidden_objects_in_subtree) == 0
    assert list_equals(
        [
            ObjectType.ticket,
            ObjectType.product,
            ObjectType.till,
            ObjectType.user_tag,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.terminal,
        ],
        top_node.computed_forbidden_objects_at_node,
    )
    assert len(top_node.computed_forbidden_objects_in_subtree) == 0
    event_node = await tree_service.create_event(
        token=global_admin_token,
        node_id=top_node.id,
        event=NewEvent(
            name="Test event",
            description="",
            currency_identifier="EUR",
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            max_account_balance=100,
            customer_portal_url=_unique_customer_portal_url(),
            customer_portal_about_page_url="https://pay.stustapay.de/about",
            customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
            customer_portal_contact_email="test@test.com",
            ust_id="UST ID",
            bon_issuer="Issuer",
            bon_address="Address",
            bon_title="Title",
            sepa_enabled=False,
            sepa_description="",
            sepa_sender_iban="",
            sepa_allowed_country_codes=[],
            sepa_sender_name="",
            forbidden_objects_in_subtree=[ObjectType.ticket],
            email_enabled=False,
            email_default_sender=None,
            email_smtp_host=None,
            email_smtp_port=None,
            email_smtp_username=None,
            email_smtp_password=None,
            payout_done_subject="[StuStaPay] Payout Completed",
            payout_done_message="Thank you for your patience. The payout process has been completed and the funds should arrive within the next days to your specified bank account.",
            payout_registered_subject="[StuStaPay] Registered for Payout",
            payout_registered_message="Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transferred to the specified bank account in our next manual payout. You will receive another email once we transferred the funds.",
            payout_sender=None,
            pretix_presale_enabled=False,
            pretix_api_key=None,
            pretix_event=None,
            pretix_organizer=None,
            pretix_shop_url=None,
            pretix_ticket_ids=None,
            wifi_ssid="festival-wifi",
            wifi_passphrase="secret1234",
        ),
    )
    assert len(event_node.forbidden_objects_at_node) == 0
    assert list_equals([ObjectType.ticket], event_node.forbidden_objects_in_subtree)
    assert len(event_node.computed_forbidden_objects_at_node) == 0
    assert list_equals(
        [
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        event_node.computed_forbidden_objects_in_subtree,
    )

    sub_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(
            name="sub-node",
            description="",
            forbidden_objects_at_node=[ObjectType.till],
            forbidden_objects_in_subtree=[ObjectType.product],
        ),
    )
    assert list_equals([ObjectType.till], sub_node.forbidden_objects_at_node)
    assert list_equals([ObjectType.product], sub_node.forbidden_objects_in_subtree)
    assert list_equals(
        [
            ObjectType.till,
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        sub_node.computed_forbidden_objects_at_node,
    )
    assert list_equals(
        [
            ObjectType.product,
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        sub_node.computed_forbidden_objects_in_subtree,
    )


async def test_copy_event(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    product_service,
    ticket_service,
    till_service,
    terminal_service,
):
    original_event = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=_build_source_event(),
    )
    source_event_id = await _event_id_for_node(db_connection, original_event.id)
    await db_connection.execute(
        "update event set sumup_oauth_refresh_token = $1, banner_image = $2, banner_image_mime_type = $3 where id = $4",
        "refresh-token-123",
        TEST_BANNER_BYTES,
        "image/png",
        source_event_id,
    )

    tax_rate_id = await db_connection.fetchval(
        "insert into tax_rate (name, rate, description, node_id) values ($1, $2, $3, $4) returning id",
        f"vat-{original_event.id}",
        0.19,
        "VAT",
        original_event.id,
    )
    assert tax_rate_id is not None

    source_secret_id = await _insert_user_tag_secret(db_connection, original_event.id)
    source_tag_id = await db_connection.fetchval(
        "insert into user_tag (uid, node_id, secret_id, restriction, pin, comment, is_vip, group_tag, account_creation_blocked) "
        "values ($1, $2, $3, $4, $5, $6, true, $7, false) returning id",
        1_000_000 + original_event.id,
        original_event.id,
        source_secret_id,
        "under_16",
        "tag-pin",
        "source tag",
        "crew",
    )
    assert source_tag_id is not None
    blocked_tag_id = await db_connection.fetchval(
        "insert into user_tag (uid, node_id, secret_id, restriction, pin, comment, is_vip, group_tag, account_creation_blocked) "
        "values ($1, $2, $3, $4, $5, $6, false, $7, true) returning id",
        1_100_000 + original_event.id,
        original_event.id,
        source_secret_id,
        "under_16",
        "blocked-pin",
        "blocked tag",
        "blocked-group",
    )
    assert blocked_tag_id is not None

    transport_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'transport', $2, '', 13, 0) returning id",
        original_event.id,
        "Transport Account",
    )
    cashier_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'cash_register', $2, '', 17, 0) returning id",
        original_event.id,
        "Cashier Account",
    )
    mapped_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'transport', $2, '', 25, 0) returning id",
        original_event.id,
        "Beer Exit",
    )
    creator_customer_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'private', $2, '', 3, 0) returning id",
        original_event.id,
        "Creator Customer Account",
    )
    source_customer_account_id = await db_connection.fetchval(
        "insert into account (node_id, user_tag_id, type, name, comment, balance, vouchers) "
        "values ($1, $2, 'private', $3, '', 50, 2) returning id",
        original_event.id,
        source_tag_id,
        "Source Customer Account",
    )
    assert transport_account_id is not None
    assert cashier_account_id is not None
    assert mapped_account_id is not None
    assert creator_customer_account_id is not None
    assert source_customer_account_id is not None

    role_id = await db_connection.fetchval(
        "insert into user_role (node_id, name, is_privileged) values ($1, $2, false) returning id",
        original_event.id,
        "event-copy-role",
    )
    assert role_id is not None
    await db_connection.execute(
        "insert into user_role_to_privilege (role_id, privilege) values ($1, 'can_book_orders')",
        role_id,
    )

    creator_id = await db_connection.fetchval(
        "insert into usr (node_id, login, description, password, display_name, customer_account_id, email) "
        "values ($1, $2, $3, 'pw', 'Creator', $4, $5) returning id",
        original_event.id,
        f"source-creator-{original_event.id}",
        "source creator",
        creator_customer_account_id,
        "creator@test.com",
    )
    copied_user_id = await db_connection.fetchval(
        "insert into usr (node_id, login, description, password, display_name, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, created_by, email) "
        "values ($1, $2, $3, 'pw', 'Source User', $4, $5, $6, $7, $8, $9) returning id",
        original_event.id,
        f"source-user-{original_event.id}",
        "source user",
        source_tag_id,
        transport_account_id,
        cashier_account_id,
        source_customer_account_id,
        creator_id,
        "source-user@test.com",
    )
    assert creator_id is not None
    assert copied_user_id is not None
    await db_connection.execute(
        "insert into user_to_role (user_id, role_id, node_id, terminal_only) values ($1, $2, $3, false)",
        copied_user_id,
        role_id,
        original_event.id,
    )

    sale_exit_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and type = 'sale_exit'",
        original_event.id,
    )
    assert sale_exit_account_id is not None

    dedicated_product = await product_service.create_product(
        token=global_admin_token,
        node_id=original_event.id,
        product=NewProduct(
            name="Mapped Dedicated Product",
            price=7.5,
            fixed_price=True,
            tax_rate_id=tax_rate_id,
            target_account_id=mapped_account_id,
        ),
    )
    system_target_product = await product_service.create_product(
        token=global_admin_token,
        node_id=original_event.id,
        product=NewProduct(
            name="Mapped System Product",
            price=2.5,
            fixed_price=True,
            tax_rate_id=tax_rate_id,
            target_account_id=sale_exit_account_id,
        ),
    )
    ticket = await ticket_service.create_ticket(
        token=global_admin_token,
        node_id=original_event.id,
        ticket=NewTicket(
            name="Weekend Ticket",
            price=15.0,
            tax_rate_id=tax_rate_id,
            restrictions=[],
            is_locked=True,
            initial_top_up_amount=10.0,
        ),
    )
    terminal = await terminal_service.create_terminal(
        token=global_admin_token,
        node_id=original_event.id,
        terminal=NewTerminal(name="Main Terminal", description="main terminal", mode=TerminalMode.till),
    )
    button = await till_service.layout.create_button(
        token=global_admin_token,
        node_id=original_event.id,
        button=NewTillButton(name="main-button", product_ids=[dedicated_product.id, system_target_product.id]),
    )
    layout = await till_service.layout.create_layout(
        token=global_admin_token,
        node_id=original_event.id,
        layout=NewTillLayout(name="sales-layout", description="sales", button_ids=[button.id], ticket_ids=[ticket.id]),
    )
    profile = await till_service.profile.create_profile(
        token=global_admin_token,
        node_id=original_event.id,
        profile=NewTillProfile(
            name="sales-profile",
            description="sales profile",
            layout_id=layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=True,
            enable_ssp_payment=True,
            enable_cash_payment=True,
            enable_card_payment=True,
        ),
    )
    await till_service.create_till(
        token=global_admin_token,
        node_id=original_event.id,
        till=NewTill(name="Bar Till", description="main bar", active_profile_id=profile.id, terminal_id=terminal.id),
    )

    copied_event = await tree_service.copy_event(
        token=global_admin_token,
        node_id=original_event.id,
        request=CopyEventRequest(
            name="Copied Event",
            description="A copy of the original event",
            options=CopyEventOptions(
                copy_event_settings=True,
                copy_user_tags=True,
                copy_account_balances=True,
                copy_tills=True,
                copy_terminals=True,
                copy_users=True,
                copy_products=True,
                copy_tse_devices=True,
            ),
        ),
    )

    assert copied_event.name == "Copied Event"
    assert copied_event.description == "A copy of the original event"
    assert copied_event.event is not None
    assert copied_event.event_node_id == copied_event.id
    assert copied_event.parent == ROOT_NODE_ID
    assert copied_event.event.expected_visitors_per_day == 3210
    assert copied_event.event.customer_portal_primary_color == "#112233"
    assert copied_event.event.customer_portal_secondary_color == "#445566"
    assert copied_event.event.customer_portal_background_color == "#ddeeff"

    copied_settings = await tree_service.get_restricted_event_settings(
        token=global_admin_token,
        node_id=copied_event.id,
    )
    original_settings = await tree_service.get_restricted_event_settings(
        token=global_admin_token,
        node_id=original_event.id,
    )
    sumup_enrichment_exclude = {
        "id",
        "languages",
        "resolved_sumup_link",
        "sumup_global_oauth_configured",
        "sumup_global_affiliate_key_configured",
        "sumup_legacy_api_key_configured",
        "sumup_legacy_oauth_configured",
        "sumup_api_key",
        "sumup_affiliate_key",
        "sumup_merchant_code",
        "sumup_oauth_client_id",
        "sumup_oauth_client_secret",
        "sumup_oauth_refresh_token",
        "sumup_topup_enabled",
        "group_topup_enabled",
        "sumup_payment_enabled",
        "customer_portal_url",
    }
    assert copied_settings.model_dump(exclude=sumup_enrichment_exclude) == original_settings.model_dump(
        exclude=sumup_enrichment_exclude
    )
    assert original_settings.resolved_sumup_link is not None
    assert copied_settings.resolved_sumup_link is None
    assert original_settings.resolved_sumup_link.source_node_id == original_event.id
    assert copied_settings.sumup_api_key == ""
    assert copied_settings.sumup_affiliate_key == ""
    assert copied_settings.sumup_merchant_code == ""
    assert copied_settings.sumup_oauth_client_id == ""
    assert copied_settings.sumup_oauth_client_secret == ""
    assert copied_settings.sumup_oauth_refresh_token == ""
    assert copied_settings.sumup_topup_enabled is False
    assert copied_settings.group_topup_enabled is False
    assert copied_settings.sumup_payment_enabled is False
    assert copied_settings.customer_portal_url == ""

    copied_banner = await db_connection.fetchrow(
        "select e.banner_image, e.banner_image_mime_type from event e join node n on n.event_id = e.id where n.id = $1",
        copied_event.id,
    )
    assert copied_banner is not None
    assert copied_banner["banner_image"] == TEST_BANNER_BYTES
    assert copied_banner["banner_image_mime_type"] == "image/png"

    copied_tag = await db_connection.fetchrow(
        "select id, uid, pin, comment, secret_id, is_vip, group_tag, account_creation_blocked "
        "from user_tag where node_id = $1 and comment = $2",
        copied_event.id,
        "source tag",
    )
    blocked_copied_tag = await db_connection.fetchrow(
        "select id, uid, pin, comment, secret_id, is_vip, group_tag, account_creation_blocked "
        "from user_tag where node_id = $1 and comment = $2",
        copied_event.id,
        "blocked tag",
    )
    assert copied_tag is not None
    assert copied_tag["uid"] == 1_000_000 + original_event.id
    assert copied_tag["pin"] == "tag-pin"
    assert copied_tag["comment"] == "source tag"
    assert copied_tag["is_vip"] is True
    assert copied_tag["group_tag"] == "crew"
    assert copied_tag["account_creation_blocked"] is False
    assert blocked_copied_tag is not None
    assert blocked_copied_tag["uid"] == 1_100_000 + original_event.id
    assert blocked_copied_tag["pin"] == "blocked-pin"
    assert blocked_copied_tag["group_tag"] == "blocked-group"
    assert blocked_copied_tag["account_creation_blocked"] is True

    copied_secret = await db_connection.fetchrow(
        "select id, encode(key0, 'hex') as key0, encode(key1, 'hex') as key1, description from user_tag_secret where node_id = $1",
        copied_event.id,
    )
    source_secret = await db_connection.fetchrow(
        "select encode(key0, 'hex') as key0, encode(key1, 'hex') as key1, description from user_tag_secret where id = $1",
        source_secret_id,
    )
    assert copied_secret is not None
    assert source_secret is not None
    assert copied_secret["id"] != source_secret_id
    assert copied_secret["key0"] == source_secret["key0"]
    assert copied_secret["key1"] == source_secret["key1"]
    assert copied_secret["description"] == source_secret["description"]
    assert copied_tag["secret_id"] == copied_secret["id"]

    copied_sale_exit_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and type = 'sale_exit'",
        copied_event.id,
    )
    copied_mapped_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and name = $2",
        copied_event.id,
        "Beer Exit",
    )
    assert copied_sale_exit_id is not None
    assert copied_mapped_account_id is not None
    assert await db_connection.fetchval(
        "select count(*) from account where node_id = $1 and type = 'sale_exit'",
        copied_event.id,
    ) == 1
    assert await db_connection.fetchval(
        "select count(*) from account where node_id = $1 and type = 'cash_entry'",
        copied_event.id,
    ) == 1

    copied_dedicated_product_id = await _fetch_product_id(db_connection, copied_event.id, "Mapped Dedicated Product")
    copied_system_target_product_id = await _fetch_product_id(db_connection, copied_event.id, "Mapped System Product")
    copied_ticket_id = await _fetch_product_id(db_connection, copied_event.id, "Weekend Ticket")

    assert await db_connection.fetchval(
        "select target_account_id from product where id = $1",
        copied_dedicated_product_id,
    ) == copied_mapped_account_id
    assert await db_connection.fetchval(
        "select target_account_id from product where id = $1",
        copied_system_target_product_id,
    ) == copied_sale_exit_id

    copied_button_id = await db_connection.fetchval(
        "select id from till_button where node_id = $1 and name = $2",
        copied_event.id,
        "main-button",
    )
    copied_layout_id = await db_connection.fetchval(
        "select id from till_layout where node_id = $1 and name = $2",
        copied_event.id,
        "sales-layout",
    )
    assert copied_button_id is not None
    assert copied_layout_id is not None

    button_product_ids = {
        row["product_id"]
        for row in await db_connection.fetch("select product_id from till_button_product where button_id = $1", copied_button_id)
    }
    assert button_product_ids == {copied_dedicated_product_id, copied_system_target_product_id}
    assert await db_connection.fetchval(
        "select ticket_id from till_layout_to_ticket where layout_id = $1",
        copied_layout_id,
    ) == copied_ticket_id

    copied_till = await db_connection.fetchrow(
        "select id, terminal_id, active_profile_id from till where node_id = $1 and name = $2",
        copied_event.id,
        "Bar Till",
    )
    copied_terminal_id = await db_connection.fetchval(
        "select id from terminal where node_id = $1 and name = $2",
        copied_event.id,
        "Main Terminal",
    )
    assert copied_till is not None
    assert copied_terminal_id is not None
    assert copied_till["terminal_id"] == copied_terminal_id
    assert await db_connection.fetchval(
        "select count(*) from till where node_id = $1 and is_virtual = true",
        copied_event.id,
    ) == 1

    copied_profile = await db_connection.fetchrow(
        "select allow_ticket_vouchers, enable_ssp_payment, enable_cash_payment, enable_card_payment "
        "from till_profile where id = $1",
        copied_till["active_profile_id"],
    )
    assert copied_profile is not None
    assert copied_profile["allow_ticket_vouchers"] is True
    assert copied_profile["enable_ssp_payment"] is True
    assert copied_profile["enable_cash_payment"] is True
    assert copied_profile["enable_card_payment"] is True

    copied_creator_id = await _fetch_user_id_by_description(db_connection, copied_event.id, "source creator")
    copied_user = await db_connection.fetchrow(
        "select id, login, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, created_by, email "
        "from usr where node_id = $1 and description = $2",
        copied_event.id,
        "source user",
    )
    copied_customer_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and name = $2",
        copied_event.id,
        "Source Customer Account",
    )
    copied_role_id = await db_connection.fetchval(
        "select id from user_role where node_id = $1 and name = $2",
        copied_event.id,
        "event-copy-role",
    )
    assert copied_user is not None
    assert copied_customer_account_id is not None
    assert copied_role_id is not None
    assert copied_user["login"] == f"source-user-{original_event.id}"
    assert copied_user["user_tag_id"] == copied_tag["id"]
    assert copied_user["transport_account_id"] is not None
    assert copied_user["cashier_account_id"] is not None
    assert copied_user["customer_account_id"] == copied_customer_account_id
    assert copied_user["created_by"] == copied_creator_id
    assert copied_user["email"] == "source-user@test.com"
    assert await db_connection.fetchval(
        "select count(*) from user_to_role where node_id = $1 and user_id = $2 and role_id = $3",
        copied_event.id,
        copied_user["id"],
        copied_role_id,
    ) == 1
    assert await db_connection.fetchval(
        "select count(*) from account where node_id = $1 and name = $2",
        copied_event.id,
        f"Customer account for source-user-{original_event.id}",
    ) == 0

    minimal_copy = await tree_service.copy_event(
        token=global_admin_token,
        node_id=original_event.id,
        request=CopyEventRequest(
            name="Minimal Copy",
            description="Copy with minimal components",
            options=CopyEventOptions(
                copy_event_settings=False,
                copy_user_tags=False,
                copy_account_balances=False,
                copy_tills=False,
                copy_terminals=False,
                copy_users=False,
                copy_products=False,
                copy_tse_devices=False,
            ),
        ),
    )
    minimal_settings = await tree_service.get_restricted_event_settings(
        token=global_admin_token,
        node_id=minimal_copy.id,
    )
    assert minimal_copy.event is not None
    assert minimal_copy.event.currency_identifier == "EUR"
    assert minimal_copy.event.max_account_balance == 150.0
    assert minimal_settings.translation_texts == {}
    assert minimal_settings.sumup_api_key == ""
    assert minimal_settings.email_smtp_password is None
    assert minimal_settings.sumup_oauth_refresh_token == ""
    assert minimal_settings.customer_portal_primary_color is None
    assert minimal_settings.expected_visitors_per_day is None
    assert minimal_settings.wifi_ssid is None
    assert await db_connection.fetchval(
        "select banner_image from event e join node n on n.event_id = e.id where n.id = $1",
        minimal_copy.id,
    ) is None


async def test_copy_event_products_without_accounts_drop_unresolved_targets(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    product_service,
):
    original_event = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=_build_source_event(name="Accountless Source", description="Accountless Source"),
    )
    tax_rate_id = await db_connection.fetchval(
        "insert into tax_rate (name, rate, description, node_id) values ($1, $2, $3, $4) returning id",
        f"vat-drop-{original_event.id}",
        0.07,
        "Reduced VAT",
        original_event.id,
    )
    dedicated_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'transport', $2, '', 9, 0) returning id",
        original_event.id,
        "Drop Account",
    )
    sale_exit_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and type = 'sale_exit'",
        original_event.id,
    )
    assert tax_rate_id is not None
    assert dedicated_account_id is not None
    assert sale_exit_account_id is not None

    await product_service.create_product(
        token=global_admin_token,
        node_id=original_event.id,
        product=NewProduct(name="Needs Account", price=4.5, fixed_price=True, tax_rate_id=tax_rate_id, target_account_id=dedicated_account_id),
    )
    await product_service.create_product(
        token=global_admin_token,
        node_id=original_event.id,
        product=NewProduct(name="Uses System Account", price=1.5, fixed_price=True, tax_rate_id=tax_rate_id, target_account_id=sale_exit_account_id),
    )

    copied_event = await tree_service.copy_event(
        token=global_admin_token,
        node_id=original_event.id,
        request=CopyEventRequest(
            name="Products Only Copy",
            description="Products without accounts",
            options=CopyEventOptions(
                copy_event_settings=False,
                copy_user_tags=False,
                copy_account_balances=False,
                copy_tills=False,
                copy_terminals=False,
                copy_users=False,
                copy_products=True,
                copy_tse_devices=False,
            ),
        ),
    )

    copied_sale_exit_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and type = 'sale_exit'",
        copied_event.id,
    )
    assert copied_sale_exit_id is not None
    assert await db_connection.fetchval(
        "select target_account_id from product where node_id = $1 and name = $2",
        copied_event.id,
        "Needs Account",
    ) is None
    assert await db_connection.fetchval(
        "select target_account_id from product where node_id = $1 and name = $2",
        copied_event.id,
        "Uses System Account",
    ) == copied_sale_exit_id
    assert await db_connection.fetchval(
        "select count(*) from account where node_id = $1 and name = $2",
        copied_event.id,
        "Drop Account",
    ) == 0


async def test_copy_event_tills_without_products_drop_unresolved_links(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    product_service,
    ticket_service,
    till_service,
    terminal_service,
):
    original_event = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=_build_source_event(name="Till Source", description="Till Source"),
    )
    tax_rate_id = await db_connection.fetchval(
        "insert into tax_rate (name, rate, description, node_id) values ($1, $2, $3, $4) returning id",
        f"vat-till-{original_event.id}",
        0.19,
        "VAT",
        original_event.id,
    )
    assert tax_rate_id is not None

    product = await product_service.create_product(
        token=global_admin_token,
        node_id=original_event.id,
        product=NewProduct(name="Till Product", price=6.0, fixed_price=True, tax_rate_id=tax_rate_id),
    )
    ticket = await ticket_service.create_ticket(
        token=global_admin_token,
        node_id=original_event.id,
        ticket=NewTicket(
            name="Till Ticket",
            price=12.0,
            tax_rate_id=tax_rate_id,
            restrictions=[],
            is_locked=True,
            initial_top_up_amount=5.0,
        ),
    )
    terminal = await terminal_service.create_terminal(
        token=global_admin_token,
        node_id=original_event.id,
        terminal=NewTerminal(name="Till Copy Terminal", description="terminal", mode=TerminalMode.till),
    )
    button = await till_service.layout.create_button(
        token=global_admin_token,
        node_id=original_event.id,
        button=NewTillButton(name="till-copy-button", product_ids=[product.id]),
    )
    layout = await till_service.layout.create_layout(
        token=global_admin_token,
        node_id=original_event.id,
        layout=NewTillLayout(name="till-copy-layout", description="layout", button_ids=[button.id], ticket_ids=[ticket.id]),
    )
    profile = await till_service.profile.create_profile(
        token=global_admin_token,
        node_id=original_event.id,
        profile=NewTillProfile(
            name="till-copy-profile",
            description="profile",
            layout_id=layout.id,
            allow_top_up=False,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=True,
            enable_ssp_payment=True,
            enable_cash_payment=True,
            enable_card_payment=False,
        ),
    )
    await till_service.create_till(
        token=global_admin_token,
        node_id=original_event.id,
        till=NewTill(name="Till Copy", description="copy me", active_profile_id=profile.id, terminal_id=terminal.id),
    )

    copied_event = await tree_service.copy_event(
        token=global_admin_token,
        node_id=original_event.id,
        request=CopyEventRequest(
            name="Till Best Effort Copy",
            description="Till best effort",
            options=CopyEventOptions(
                copy_event_settings=False,
                copy_user_tags=False,
                copy_account_balances=False,
                copy_tills=True,
                copy_terminals=True,
                copy_users=False,
                copy_products=False,
                copy_tse_devices=False,
            ),
        ),
    )

    copied_button_id = await db_connection.fetchval(
        "select id from till_button where node_id = $1 and name = $2",
        copied_event.id,
        "till-copy-button",
    )
    copied_layout_id = await db_connection.fetchval(
        "select id from till_layout where node_id = $1 and name = $2",
        copied_event.id,
        "till-copy-layout",
    )
    copied_till = await db_connection.fetchrow(
        "select terminal_id from till where node_id = $1 and name = $2",
        copied_event.id,
        "Till Copy",
    )
    copied_terminal_id = await db_connection.fetchval(
        "select id from terminal where node_id = $1 and name = $2",
        copied_event.id,
        "Till Copy Terminal",
    )
    assert copied_button_id is not None
    assert copied_layout_id is not None
    assert copied_till is not None
    assert copied_terminal_id is not None
    assert copied_till["terminal_id"] == copied_terminal_id
    assert await db_connection.fetchval(
        "select count(*) from till_button_product where button_id = $1",
        copied_button_id,
    ) == 0
    assert await db_connection.fetchval(
        "select count(*) from till_layout_to_ticket where layout_id = $1",
        copied_layout_id,
    ) == 0


async def test_copy_event_sub_nodes_preserve_internal_mappings(
    db_connection: Connection,
    tree_service: TreeService,
    global_admin_token: str,
    product_service,
    ticket_service,
    till_service,
    terminal_service,
):
    original_event = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=_build_source_event(name="Subtree Source", description="Subtree Source"),
    )
    child_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=original_event.id,
        new_node=NewNode(name="Crew Area", description="crew area"),
    )
    tax_rate_id = await db_connection.fetchval(
        "insert into tax_rate (name, rate, description, node_id) values ($1, $2, $3, $4) returning id",
        f"vat-child-{child_node.id}",
        0.19,
        "Child VAT",
        child_node.id,
    )
    assert tax_rate_id is not None

    secret_id = await _insert_user_tag_secret(db_connection, original_event.id, description="child secret")
    child_tag_id = await db_connection.fetchval(
        "insert into user_tag (uid, node_id, secret_id, pin, comment) values ($1, $2, $3, $4, $5) returning id",
        2_000_000 + child_node.id,
        child_node.id,
        secret_id,
        "child-pin",
        "child tag",
    )
    transport_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'transport', $2, '', 8, 0) returning id",
        child_node.id,
        "Child Transport Account",
    )
    customer_account_id = await db_connection.fetchval(
        "insert into account (node_id, user_tag_id, type, name, comment, balance, vouchers) values ($1, $2, 'private', $3, '', 11, 1) returning id",
        child_node.id,
        child_tag_id,
        "Child Customer Account",
    )
    creator_customer_account_id = await db_connection.fetchval(
        "insert into account (node_id, type, name, comment, balance, vouchers) values ($1, 'private', $2, '', 0, 0) returning id",
        child_node.id,
        "Child Creator Account",
    )
    assert child_tag_id is not None
    assert transport_account_id is not None
    assert customer_account_id is not None
    assert creator_customer_account_id is not None

    child_role_id = await db_connection.fetchval(
        "insert into user_role (node_id, name, is_privileged) values ($1, $2, false) returning id",
        child_node.id,
        "child-role",
    )
    assert child_role_id is not None
    await db_connection.execute(
        "insert into user_role_to_privilege (role_id, privilege) values ($1, 'can_book_orders')",
        child_role_id,
    )

    child_creator_id = await db_connection.fetchval(
        "insert into usr (node_id, login, description, password, display_name, customer_account_id) "
        "values ($1, $2, $3, 'pw', 'Child Creator', $4) returning id",
        child_node.id,
        f"child-creator-{child_node.id}",
        "child creator",
        creator_customer_account_id,
    )
    child_user_id = await db_connection.fetchval(
        "insert into usr (node_id, login, description, password, display_name, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, created_by) "
        "values ($1, $2, $3, 'pw', 'Child User', $4, $5, $5, $6, $7) returning id",
        child_node.id,
        f"child-user-{child_node.id}",
        "child user",
        child_tag_id,
        transport_account_id,
        customer_account_id,
        child_creator_id,
    )
    assert child_creator_id is not None
    assert child_user_id is not None
    await db_connection.execute(
        "insert into user_to_role (user_id, role_id, node_id, terminal_only) values ($1, $2, $3, false)",
        child_user_id,
        child_role_id,
        child_node.id,
    )

    child_product = await product_service.create_product(
        token=global_admin_token,
        node_id=child_node.id,
        product=NewProduct(
            name="Child Product",
            price=3.0,
            fixed_price=True,
            tax_rate_id=tax_rate_id,
            target_account_id=transport_account_id,
        ),
    )
    child_ticket = await ticket_service.create_ticket(
        token=global_admin_token,
        node_id=child_node.id,
        ticket=NewTicket(
            name="Child Ticket",
            price=9.0,
            tax_rate_id=tax_rate_id,
            restrictions=[],
            is_locked=True,
            initial_top_up_amount=2.0,
        ),
    )
    child_terminal = await terminal_service.create_terminal(
        token=global_admin_token,
        node_id=child_node.id,
        terminal=NewTerminal(name="Child Terminal", description="terminal", mode=TerminalMode.till),
    )
    child_button = await till_service.layout.create_button(
        token=global_admin_token,
        node_id=child_node.id,
        button=NewTillButton(name="child-button", product_ids=[child_product.id]),
    )
    child_layout = await till_service.layout.create_layout(
        token=global_admin_token,
        node_id=child_node.id,
        layout=NewTillLayout(name="child-layout", description="layout", button_ids=[child_button.id], ticket_ids=[child_ticket.id]),
    )
    child_profile = await till_service.profile.create_profile(
        token=global_admin_token,
        node_id=child_node.id,
        profile=NewTillProfile(
            name="child-profile",
            description="profile",
            layout_id=child_layout.id,
            allow_top_up=True,
            allow_cash_out=False,
            allow_ticket_sale=True,
            allow_ticket_vouchers=False,
            enable_ssp_payment=True,
            enable_cash_payment=True,
            enable_card_payment=False,
        ),
    )
    await till_service.create_till(
        token=global_admin_token,
        node_id=child_node.id,
        till=NewTill(name="Child Till", description="child till", active_profile_id=child_profile.id, terminal_id=child_terminal.id),
    )

    copied_event = await tree_service.copy_event(
        token=global_admin_token,
        node_id=original_event.id,
        request=CopyEventRequest(
            name="Subtree Copy",
            description="Subtree copy",
            options=CopyEventOptions(
                copy_event_settings=False,
                copy_user_tags=True,
                copy_account_balances=True,
                copy_tills=True,
                copy_terminals=True,
                copy_users=True,
                copy_products=True,
                copy_tse_devices=False,
                copy_sub_nodes=True,
            ),
        ),
    )

    copied_child_id = await _fetch_node_id_by_parent_and_name(db_connection, copied_event.id, "Crew Area")
    copied_child_tag = await db_connection.fetchrow(
        "select id, uid from user_tag where node_id = $1 and comment = $2",
        copied_child_id,
        "child tag",
    )
    copied_transport_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and name = $2",
        copied_child_id,
        "Child Transport Account",
    )
    copied_customer_account_id = await db_connection.fetchval(
        "select id from account where node_id = $1 and name = $2",
        copied_child_id,
        "Child Customer Account",
    )
    copied_creator_id = await _fetch_user_id_by_description(db_connection, copied_child_id, "child creator")
    copied_user = await db_connection.fetchrow(
        "select id, login, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, created_by "
        "from usr where node_id = $1 and description = $2",
        copied_child_id,
        "child user",
    )
    copied_product_id = await _fetch_product_id(db_connection, copied_child_id, "Child Product")
    copied_ticket_id = await _fetch_product_id(db_connection, copied_child_id, "Child Ticket")
    copied_button_id = await db_connection.fetchval(
        "select id from till_button where node_id = $1 and name = $2",
        copied_child_id,
        "child-button",
    )
    copied_layout_id = await db_connection.fetchval(
        "select id from till_layout where node_id = $1 and name = $2",
        copied_child_id,
        "child-layout",
    )
    copied_terminal_id = await db_connection.fetchval(
        "select id from terminal where node_id = $1 and name = $2",
        copied_child_id,
        "Child Terminal",
    )
    copied_till = await db_connection.fetchrow(
        "select terminal_id from till where node_id = $1 and name = $2",
        copied_child_id,
        "Child Till",
    )

    assert copied_child_tag is not None
    assert copied_child_tag["uid"] == 2_000_000 + child_node.id
    assert copied_transport_account_id is not None
    assert copied_customer_account_id is not None
    assert copied_user is not None
    assert copied_button_id is not None
    assert copied_layout_id is not None
    assert copied_terminal_id is not None
    assert copied_till is not None
    assert copied_user["login"] == f"child-user-{child_node.id}"
    assert copied_user["user_tag_id"] == copied_child_tag["id"]
    assert copied_user["transport_account_id"] == copied_transport_account_id
    assert copied_user["cashier_account_id"] == copied_transport_account_id
    assert copied_user["customer_account_id"] == copied_customer_account_id
    assert copied_user["created_by"] == copied_creator_id
    assert await db_connection.fetchval(
        "select target_account_id from product where id = $1",
        copied_product_id,
    ) == copied_transport_account_id
    assert await db_connection.fetchval(
        "select product_id from till_button_product where button_id = $1",
        copied_button_id,
    ) == copied_product_id
    assert await db_connection.fetchval(
        "select ticket_id from till_layout_to_ticket where layout_id = $1",
        copied_layout_id,
    ) == copied_ticket_id
    assert copied_till["terminal_id"] == copied_terminal_id


def test_update_event_wifi_requires_both_fields():
    with pytest.raises(ValidationError):
        UpdateEvent(
            currency_identifier="EUR",
            max_account_balance=100,
            vip_max_account_balance=300,
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            customer_portal_url=_unique_customer_portal_url(),
            customer_portal_about_page_url="https://pay.stustapay.de/about",
            customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
            customer_portal_contact_email="test@test.com",
            pretix_presale_enabled=False,
            pretix_shop_url=None,
            pretix_organizer=None,
            pretix_event=None,
            pretix_ticket_ids=None,
            ust_id="UST ID",
            bon_issuer="Issuer",
            bon_address="Address",
            bon_title="Title",
            sepa_enabled=False,
            sepa_sender_name="",
            sepa_sender_iban="",
            sepa_description="",
            sepa_max_num_payouts_in_run=100,
            sepa_allowed_country_codes=[],
            email_enabled=False,
            payout_sender=None,
            donation_enabled=True,
            pretix_api_key=None,
            wifi_ssid="festival-wifi",
        )
