# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import secrets

import pytest
from sftkit.database import Connection
from sftkit.error import AccessDenied, InvalidArgument

from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, Node
from stustapay.core.schema.user import NewUser, NewUserRole, NewUserToRoles, Privilege
from stustapay.core.service.account import AccountService
from stustapay.core.service.tree.service import create_event
from stustapay.core.service.user import UserService

from .conftest import CreateRandomUserTag


async def _create_event_token_with_privileges(
    *,
    create_random_user_tag: CreateRandomUserTag,
    event_node: Node,
    global_admin_token: str,
    privileges: list[Privilege],
    user_service: UserService,
) -> str:
    user_tag = await create_random_user_tag()
    role = await user_service.create_user_role(
        token=global_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"account-service-test-role-{secrets.token_hex(8)}",
            is_privileged=False,
            privileges=privileges,
        ),
    )
    user = await user_service.create_user(
        node_id=event_node.id,
        token=global_admin_token,
        new_user=NewUser(
            login=f"account-service-user-{secrets.token_hex(8)}",
            description="",
            display_name="Account Service Test User",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
        password="rolf",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=user.id, role_ids=[role.id]),
    )
    login_result = await user_service.login_user(username=user.login, password="rolf")
    assert login_result.success is not None
    return login_result.success.token


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


async def test_swap_customer_tag_without_existing_target_account(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()
    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance, vouchers) "
        "values ($1, $2, 'private', 'source-account', 4.50, 2) returning id",
        event_node.id,
        source_tag.id,
    )

    result = await account_service.swap_customer_tag(
        token=event_admin_token,
        node_id=event_node.id,
        source_user_tag_id=source_tag.id,
        target_user_tag_id=target_tag.id,
        comment="defekt",
        block_source_tag=True,
    )

    account = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=source_account_id)
    source_tag_blocked = await db_connection.fetchval(
        "select account_creation_blocked from user_tag where id = $1",
        source_tag.id,
    )
    source_tag_comment = await db_connection.fetchval("select comment from user_tag where id = $1", source_tag.id)

    assert result.customer_account_id == source_account_id
    assert result.used_existing_target_account is False
    assert account.user_tag_id == target_tag.id
    assert account.user_tag_uid == target_tag.uid
    assert source_tag_blocked is True
    assert source_tag_comment == "defekt"
    assert len(account.tag_history) == 1
    assert account.tag_history[0].user_tag_id == source_tag.id


async def test_swap_customer_tag_rejects_source_tag_assigned_to_user(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()

    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'source-account') returning id",
        event_node.id,
        source_tag.id,
    )
    await db_connection.execute(
        "insert into usr (login, display_name, user_tag_id, customer_account_id, node_id) values ($1, $2, $3, $4, $5)",
        "linked-user-source-account",
        "Linked User",
        source_tag.id,
        source_account_id,
        event_node.id,
    )

    with pytest.raises(InvalidArgument, match="Source tag is assigned to a user"):
        await account_service.swap_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            source_user_tag_id=source_tag.id,
            target_user_tag_id=target_tag.id,
            comment="defektes band",
            block_source_tag=True,
        )


async def test_swap_customer_tag_rejects_in_use_target_account(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()
    await db_connection.execute(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'source-account')",
        event_node.id,
        source_tag.id,
    )
    await db_connection.execute(
        "insert into account(node_id, user_tag_id, type, name, balance) values ($1, $2, 'private', 'target-account', 1.00)",
        event_node.id,
        target_tag.id,
    )

    with pytest.raises(InvalidArgument, match="in-use account"):
        await account_service.swap_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            source_user_tag_id=source_tag.id,
            target_user_tag_id=target_tag.id,
            comment="defekt",
            block_source_tag=True,
        )


async def test_find_customer_tag_swap_candidates_allows_customer_management(
    account_service: AccountService,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
    event_node: Node,
    global_admin_token: str,
    user_service: UserService,
):
    customer_management_token = await _create_event_token_with_privileges(
        create_random_user_tag=create_random_user_tag,
        event_node=event_node,
        global_admin_token=global_admin_token,
        privileges=[Privilege.customer_management],
        user_service=user_service,
    )
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()
    await db_connection.execute(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'source-account')",
        event_node.id,
        source_tag.id,
    )

    source_candidates = await account_service.find_customer_tag_swap_candidates(
        token=customer_management_token,
        node_id=event_node.id,
        search_term=source_tag.pin,
        mode="source",
    )
    target_candidates = await account_service.find_customer_tag_swap_candidates(
        token=customer_management_token,
        node_id=event_node.id,
        search_term=target_tag.pin,
        mode="target",
    )

    assert any(candidate.user_tag_id == source_tag.id for candidate in source_candidates)
    assert any(candidate.user_tag_id == target_tag.id for candidate in target_candidates)


async def test_swap_customer_tag_allows_customer_management(
    account_service: AccountService,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
    event_node: Node,
    global_admin_token: str,
    user_service: UserService,
):
    customer_management_token = await _create_event_token_with_privileges(
        create_random_user_tag=create_random_user_tag,
        event_node=event_node,
        global_admin_token=global_admin_token,
        privileges=[Privilege.customer_management],
        user_service=user_service,
    )
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()
    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance, vouchers) "
        "values ($1, $2, 'private', 'source-account', 4.50, 2) returning id",
        event_node.id,
        source_tag.id,
    )

    result = await account_service.swap_customer_tag(
        token=customer_management_token,
        node_id=event_node.id,
        source_user_tag_id=source_tag.id,
        target_user_tag_id=target_tag.id,
        comment="defekt",
        block_source_tag=True,
    )

    account = await account_service.get_customer(
        token=customer_management_token,
        node_id=event_node.id,
        customer_id=source_account_id,
    )

    assert result.customer_account_id == source_account_id
    assert result.used_existing_target_account is False
    assert account.user_tag_id == target_tag.id


async def test_customer_management_swap_customer_tag_denies_users_without_privilege(
    account_service: AccountService,
    cashier,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
    event_node: Node,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()
    await db_connection.execute(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'source-account')",
        event_node.id,
        source_tag.id,
    )

    with pytest.raises(AccessDenied):
        await account_service.find_customer_tag_swap_candidates(
            token=cashier.token,
            node_id=event_node.id,
            search_term=source_tag.pin,
            mode="source",
        )

    with pytest.raises(AccessDenied):
        await account_service.swap_customer_tag(
            token=cashier.token,
            node_id=event_node.id,
            source_user_tag_id=source_tag.id,
            target_user_tag_id=target_tag.id,
            comment="defekt",
            block_source_tag=True,
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
            customer_portal_url="",
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
            customer_portal_url="",
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
