#!/usr/bin/env python3
"""Seed deterministic data for customerportal Playwright e2e tests."""

import asyncio
import os
import sys
from pathlib import Path

from stustapay.core.config import read_config
from stustapay.core.database import get_database, reset_schema
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent
from stustapay.core.service.tree.service import create_event

REPO_ROOT = Path(__file__).resolve().parents[2]

E2E_PIN = "E2ETESTPIN00000001"
E2E_BALANCE = 120.0
E2E_IBAN = "DE89370400440532013000"
E2E_ACCOUNT_NAME = "Test User"
E2E_EMAIL = "e2e-test@example.com"
CUSTOMER_PORTAL_URL = "http://localhost:4300"


async def seed(config_path: Path) -> None:
    config = read_config(config_path)
    db = get_database(config.database)
    pool = await db.create_pool(n_connections=5)

    await reset_schema(pool)
    await db.apply_migrations()

    async with pool.acquire() as conn:
        event_node = await create_event(
            conn=conn,
            parent_id=ROOT_NODE_ID,
            event=NewEvent(
                name="E2E Test Event",
                description="Deterministic event for customerportal e2e tests",
                customer_portal_url=CUSTOMER_PORTAL_URL,
                customer_portal_contact_email="e2e-test@example.com",
                customer_portal_about_page_url="",
                customer_portal_data_privacy_url="",
                currency_identifier="EUR",
                sepa_enabled=True,
                sepa_sender_name="E2E Test Sender",
                sepa_description="e2e payout {user_tag_uid}",
                sepa_sender_iban=E2E_IBAN,
                sepa_allowed_country_codes=["DE"],
                bon_title="",
                bon_issuer="",
                bon_street="",
                bon_zip="",
                bon_city="",
                bon_country="DEU",
                max_account_balance=150,
                sumup_topup_enabled=False,
                sumup_payment_enabled=False,
                sumup_affiliate_key="",
                sumup_api_key="",
                sumup_merchant_code="",
                ust_id="",
                email_enabled=False,
                email_default_sender=None,
                email_smtp_host=None,
                email_smtp_port=None,
                email_smtp_username=None,
                email_smtp_password=None,
                payout_done_subject="[StuStaPay] Payout Completed",
                payout_done_message="Payout completed.",
                payout_registered_subject="[StuStaPay] Registered for Payout",
                payout_registered_message="Registered for payout.",
                payout_sender=None,
                pretix_presale_enabled=False,
                pretix_api_key=None,
                pretix_event=None,
                pretix_organizer=None,
                pretix_shop_url=None,
                pretix_ticket_ids=[],
                pretix_topup_ids=[],
            ),
        )

        user_tag_secret_id = await conn.fetchval(
            "insert into user_tag_secret (node_id, key0, key1) overriding system value values "
            "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
            "returning id",
            event_node.id,
        )

        user_tag_id = await conn.fetchval(
            "insert into user_tag (node_id, secret_id, pin) values ($1, $2, $3) returning id",
            event_node.id,
            user_tag_secret_id,
            E2E_PIN,
        )

        await conn.execute(
            "insert into account (node_id, user_tag_id, balance, type) values ($1, $2, $3, 'private')",
            event_node.id,
            user_tag_id,
            E2E_BALANCE,
        )

    await pool.close()
    print(f"Seeded customerportal e2e data (event node id={event_node.id}, pin={E2E_PIN})")


def main() -> None:
    config_path = Path(os.environ.get("STUSTAPAY_CONFIG", REPO_ROOT / "etc" / "config.e2e.yaml"))
    if not config_path.is_absolute():
        config_path = REPO_ROOT / config_path

    if not config_path.exists():
        print(f"Config file not found: {config_path}", file=sys.stderr)
        sys.exit(1)

    asyncio.run(seed(config_path))


if __name__ == "__main__":
    main()
