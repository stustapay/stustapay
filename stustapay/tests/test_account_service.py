# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import pytest
from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.tree import NewEvent, ROOT_NODE_ID
from stustapay.core.schema.tree import Node
from stustapay.core.service.account import AccountService
from stustapay.core.service.tree.service import create_event

from .conftest import CreateRandomUserTag


async def test_account_comment_updates(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        user_tag.id,
    )

    acc = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=account_id)
    assert acc is not None
    assert acc.comment is None

    await account_service.update_account_comment(
        token=event_admin_token, node_id=event_node.id, account_id=account_id, comment="foobar"
    )
    acc = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=account_id)
    assert acc is not None
    assert "foobar" == acc.comment


async def test_account_balance_transfer(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()

    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'source-account', 10.00) returning id",
        event_node.id,
        source_tag.id,
    )
    target_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'target-account', 3.50) returning id",
        event_node.id,
        target_tag.id,
    )

    await account_service.transfer_account_balance(
        token=event_admin_token,
        node_id=event_node.id,
        source_account_id=source_account_id,
        target_account_id=target_account_id,
        amount=2.25,
    )

    source_acc = await account_service.get_account(
        token=event_admin_token, node_id=event_node.id, account_id=source_account_id
    )
    target_acc = await account_service.get_account(
        token=event_admin_token, node_id=event_node.id, account_id=target_account_id
    )
    assert source_acc.balance == pytest.approx(7.75)
    assert target_acc.balance == pytest.approx(5.75)


async def test_account_balance_transfer_rejects_invalid_requests(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()

    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'source-account', 5.00) returning id",
        event_node.id,
        source_tag.id,
    )
    target_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'target-account', 0.00) returning id",
        event_node.id,
        target_tag.id,
    )

    with pytest.raises(InvalidArgument):
        await account_service.transfer_account_balance(
            token=event_admin_token,
            node_id=event_node.id,
            source_account_id=source_account_id,
            target_account_id=source_account_id,
            amount=1.0,
        )

    with pytest.raises(InvalidArgument):
        await account_service.transfer_account_balance(
            token=event_admin_token,
            node_id=event_node.id,
            source_account_id=source_account_id,
            target_account_id=target_account_id,
            amount=0,
        )

    with pytest.raises(InvalidArgument):
        await account_service.transfer_account_balance(
            token=event_admin_token,
            node_id=event_node.id,
            source_account_id=source_account_id,
            target_account_id=target_account_id,
            amount=7.0,
        )


async def test_find_accounts_does_not_leak_accounts_from_other_nodes(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
):
    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=NewEvent(
            name="other-event",
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

    user_tag_secret_id = await db_connection.fetchval(
        "insert into user_tag_secret (node_id, key0, key1) values "
        "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
        "returning id",
        other_event.id,
    )
    other_uid = 0xABCDEF01
    other_user_tag_id = await db_connection.fetchval(
        "insert into user_tag (uid, node_id, secret_id, pin) values ($1, $2, $3, $4) returning id",
        other_uid,
        other_event.id,
        user_tag_secret_id,
        "other-tag-pin",
    )
    other_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) "
        "values ($1, $2, 'private', 'other-account') returning id",
        other_event.id,
        other_user_tag_id,
    )

    found_accounts = await account_service.find_accounts(
        token=event_admin_token,
        node_id=event_node.id,
        search_term=f"{other_uid:x}",
    )
    found_account_ids = {account.id for account in found_accounts}
    assert other_account_id not in found_account_ids


async def test_find_customers_matches_case_insensitive_fields_and_tokens(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    customer_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, comment) "
        "values ($1, $2, 'private', 'Max Muster', 'Festival Support') returning id",
        event_node.id,
        user_tag.id,
    )
    await db_connection.execute(
        "update customer_info set iban = $2, account_name = $3, email = $4, has_entered_info = true "
        "where customer_account_id = $1",
        customer_id,
        "DE89370400440532013000",
        "Ada Holder",
        "Muster@example.com",
    )

    search_terms = [
        "mAx",
        "SUPPORT",
        "example.com",
        "DE89370400440532013000",
        "holder ada",
        user_tag.pin[:10].upper(),
        f"0x{user_tag.uid:x}".upper(),
        "muster support",
    ]

    for search_term in search_terms:
        found_customers = await account_service.find_customers(
            token=event_admin_token,
            node_id=event_node.id,
            search_term=search_term,
        )
        found_customer_ids = {customer.id for customer in found_customers}
        assert customer_id in found_customer_ids, f"expected customer match for search term {search_term!r}"


async def test_find_customers_does_not_leak_customers_from_other_nodes(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
):
    other_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=NewEvent(
            name="other-customer-event",
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

    user_tag_secret_id = await db_connection.fetchval(
        "insert into user_tag_secret (node_id, key0, key1) values "
        "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
        "returning id",
        other_event.id,
    )
    other_user_tag_id = await db_connection.fetchval(
        "insert into user_tag (uid, node_id, secret_id, pin) values ($1, $2, $3, $4) returning id",
        0xABCDE123,
        other_event.id,
        user_tag_secret_id,
        "other-customer-tag",
    )
    other_customer_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) "
        "values ($1, $2, 'private', 'External Customer') returning id",
        other_event.id,
        other_user_tag_id,
    )
    await db_connection.execute(
        "update customer_info set iban = $2, account_name = $3, email = $4, has_entered_info = true "
        "where customer_account_id = $1",
        other_customer_id,
        "DE12345678901234567890",
        "External Holder",
        "outside.customer@example.com",
    )

    found_customers = await account_service.find_customers(
        token=event_admin_token,
        node_id=event_node.id,
        search_term="outside.customer@example.com",
    )
    found_customer_ids = {customer.id for customer in found_customers}
    assert other_customer_id not in found_customer_ids


async def test_find_accounts_matches_case_insensitive_fields_and_tokens(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, comment) "
        "values ($1, $2, 'private', 'Late Night Buyer', 'North Gate Shift') returning id",
        event_node.id,
        user_tag.id,
    )

    search_terms = [
        "LATE",
        "gate",
        user_tag.pin[:10].upper(),
        f"0x{user_tag.uid:x}".upper(),
        "buyer north",
    ]

    for search_term in search_terms:
        found_accounts = await account_service.find_accounts(
            token=event_admin_token,
            node_id=event_node.id,
            search_term=search_term,
        )
        found_account_ids = {account.id for account in found_accounts}
        assert account_id in found_account_ids, f"expected account match for search term {search_term!r}"
