# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import asyncpg
import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user_tag import NewUserTag
from stustapay.core.service.user_tag import UserTagService
from .conftest import CreateRandomUserTag


async def test_user_tag_comment_updates(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()

    user_tag_detail = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_detail is not None
    assert user_tag_detail.comment is None

    await user_tag_service.update_user_tag_comment(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id, comment="foobar"
    )
    user_tag_detail = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_detail is not None
    assert "foobar" == user_tag_detail.comment


async def test_user_tag_group_tag_updates(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()

    user_tag_detail = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_detail is not None
    assert user_tag_detail.group_tag is None

    updated = await user_tag_service.update_user_tag_group_tag(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id, group_tag="crew-a"
    )
    assert updated.group_tag == "crew-a"

    cleared = await user_tag_service.update_user_tag_group_tag(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id, group_tag=None
    )
    assert cleared.group_tag is None


async def test_count_tags_without_accounts(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    """Test counting tags without accounts."""
    # Initially, there should be some tags without accounts (from fixtures)
    initial_count = await user_tag_service.count_tags_without_accounts(
        token=event_admin_token, node_id=event_node.id
    )

    # Create a new tag without an account
    tag1 = await create_random_user_tag()
    count_after_tag1 = await user_tag_service.count_tags_without_accounts(
        token=event_admin_token, node_id=event_node.id
    )
    assert count_after_tag1 == initial_count + 1

    # Create another tag without an account
    tag2 = await create_random_user_tag()
    count_after_tag2 = await user_tag_service.count_tags_without_accounts(
        token=event_admin_token, node_id=event_node.id
    )
    assert count_after_tag2 == initial_count + 2

    # Create an account for tag1
    await db_connection.execute(
        "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private')",
        event_node.id,
        tag1.id,
    )

    # Count should decrease by 1
    count_after_account = await user_tag_service.count_tags_without_accounts(
        token=event_admin_token, node_id=event_node.id
    )
    assert count_after_account == initial_count + 1


async def test_create_accounts_for_tags_all_tags(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    """Test creating accounts for all tags without accounts."""
    # Create a few tags without accounts
    tag1 = await create_random_user_tag()
    tag2 = await create_random_user_tag()
    tag3 = await create_random_user_tag()

    # Verify they don't have accounts
    account_count = await db_connection.fetchval(
        "select count(*) from account where user_tag_id in ($1, $2, $3)", tag1.id, tag2.id, tag3.id
    )
    assert account_count == 0

    # Create accounts for all tags without accounts (passing None)
    result = await user_tag_service.create_accounts_for_tags(
        token=event_admin_token, node_id=event_node.id, user_tag_ids=None
    )

    # Should have created at least 3 accounts (and possibly more from fixtures)
    assert result["created"] >= 3
    assert result["skipped"] == 0

    # Verify the tags now have accounts
    account_count_after = await db_connection.fetchval(
        "select count(*) from account where user_tag_id in ($1, $2, $3)", tag1.id, tag2.id, tag3.id
    )
    assert account_count_after == 3


async def test_create_accounts_for_tags_specific_ids(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    """Test creating accounts for specific tag IDs."""
    # Create tags
    tag1 = await create_random_user_tag()
    tag2 = await create_random_user_tag()
    tag3 = await create_random_user_tag()

    # Verify they don't have accounts initially
    account_count_before = await db_connection.fetchval(
        "select count(*) from account where user_tag_id in ($1, $2, $3)", tag1.id, tag2.id, tag3.id
    )
    assert account_count_before == 0

    # Get event node ID (accounts are created at event node level)
    event_node_id = await db_connection.fetchval("select event_node_id from node where id = $1", event_node.id)
    assert event_node_id is not None

    # Create account for tag1 manually at event node level
    await db_connection.execute(
        "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private')",
        event_node_id,
        tag1.id,
    )

    # Verify tag1 now has an account
    account_count_after_tag1 = await db_connection.fetchval(
        "select count(*) from account where user_tag_id = $1", tag1.id
    )
    assert account_count_after_tag1 == 1

    # Verify tag2 and tag3 still don't have accounts
    account_count_tag2 = await db_connection.fetchval(
        "select count(*) from account where user_tag_id = $1", tag2.id
    )
    account_count_tag3 = await db_connection.fetchval(
        "select count(*) from account where user_tag_id = $1", tag3.id
    )
    assert account_count_tag2 == 0
    assert account_count_tag3 == 0

    # Create accounts for specific tags (tag2 and tag3, but tag1 already has an account)
    result = await user_tag_service.create_accounts_for_tags(
        token=event_admin_token, node_id=event_node.id, user_tag_ids=[tag1.id, tag2.id, tag3.id]
    )

    # Should have created 2 accounts (tag2 and tag3), skipped 1 (tag1)
    # Note: The skipped count includes all tags in the list that have accounts,
    # which should only be tag1 at this point
    assert result["created"] == 2, f"Expected 2 created, got {result['created']}. Skipped: {result['skipped']}"
    assert result["skipped"] == 1, f"Expected 1 skipped, got {result['skipped']}. Created: {result['created']}"

    # Verify all tags now have accounts
    account_count = await db_connection.fetchval(
        "select count(*) from account where user_tag_id in ($1, $2, $3)", tag1.id, tag2.id, tag3.id
    )
    assert account_count == 3


async def test_create_accounts_for_tags_empty_list(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
):
    """Test creating accounts with empty tag ID list."""
    result = await user_tag_service.create_accounts_for_tags(
        token=event_admin_token, node_id=event_node.id, user_tag_ids=[]
    )

    assert result["created"] == 0
    assert result["skipped"] == 0


async def test_update_user_tag_account_creation_blocked(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()

    updated = await user_tag_service.update_user_tag_account_creation_blocked(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_id=user_tag.id,
        account_creation_blocked=True,
    )
    assert updated.account_creation_blocked is True

    reverted = await user_tag_service.update_user_tag_account_creation_blocked(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_id=user_tag.id,
        account_creation_blocked=False,
    )
    assert reverted.account_creation_blocked is False


async def test_create_accounts_for_tags_ignores_blocked_tags(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    allowed_tag = await create_random_user_tag()
    blocked_tag = await create_random_user_tag()
    await db_connection.execute("update user_tag set account_creation_blocked = true where id = $1", blocked_tag.id)

    count = await user_tag_service.count_tags_without_accounts(token=event_admin_token, node_id=event_node.id)
    result = await user_tag_service.create_accounts_for_tags(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_ids=[allowed_tag.id, blocked_tag.id],
    )

    allowed_account_count = await db_connection.fetchval("select count(*) from account where user_tag_id = $1", allowed_tag.id)
    blocked_account_count = await db_connection.fetchval("select count(*) from account where user_tag_id = $1", blocked_tag.id)

    assert count >= 1
    assert result["created"] == 1
    assert result["skipped"] == 0
    assert allowed_account_count == 1
    assert blocked_account_count == 0


async def test_blocked_tag_rejects_private_account_creation(
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    blocked_tag = await create_random_user_tag()
    await db_connection.execute("update user_tag set account_creation_blocked = true where id = $1", blocked_tag.id)

    with pytest.raises(Exception, match="Tag is blocked from account creation"):
        await db_connection.execute(
            "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private')",
            event_node.id,
            blocked_tag.id,
        )


async def test_find_user_tags_by_decimal_uid(
    user_tag_service: UserTagService,
    event_node: Node,
    global_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    """Test finding user tags by decimal UID."""
    tag = await create_random_user_tag()
    assert tag.uid is not None

    # Search by decimal UID
    results = await user_tag_service.find_user_tags(
        token=global_admin_token, node_id=event_node.id, search_term=str(tag.uid)
    )

    # Should find the tag
    found_tag = next((t for t in results if t.id == tag.id), None)
    assert found_tag is not None
    assert found_tag.uid == tag.uid


async def test_find_user_tags_by_hex_uid(
    user_tag_service: UserTagService,
    event_node: Node,
    global_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    """Test finding user tags by hex UID (with and without 0x prefix)."""
    tag = await create_random_user_tag()
    assert tag.uid is not None

    # Convert UID to hex (without 0x prefix, uppercase)
    hex_uid = hex(tag.uid)[2:].upper()

    # Search by hex UID without 0x prefix
    results = await user_tag_service.find_user_tags(
        token=global_admin_token, node_id=event_node.id, search_term=hex_uid
    )

    # Should find the tag
    found_tag = next((t for t in results if t.id == tag.id), None)
    assert found_tag is not None
    assert found_tag.uid == tag.uid

    # Search by hex UID with 0x prefix
    results_with_prefix = await user_tag_service.find_user_tags(
        token=global_admin_token, node_id=event_node.id, search_term=f"0x{hex_uid}"
    )

    # Should find the tag
    found_tag_with_prefix = next((t for t in results_with_prefix if t.id == tag.id), None)
    assert found_tag_with_prefix is not None
    assert found_tag_with_prefix.uid == tag.uid


async def test_find_user_tags_by_pin(
    user_tag_service: UserTagService,
    event_node: Node,
    global_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    """Test finding user tags by PIN."""
    tag = await create_random_user_tag()

    # Get the PIN from the database
    pin = await db_connection.fetchval("select pin from user_tag where id = $1", tag.id)
    assert pin is not None

    # Search by PIN
    results = await user_tag_service.find_user_tags(
        token=global_admin_token, node_id=event_node.id, search_term=pin.upper()
    )

    # Should find the tag
    found_tag = next((t for t in results if t.id == tag.id), None)
    assert found_tag is not None


async def test_find_user_tags_by_comment_and_group_tag(
    user_tag_service: UserTagService,
    event_node: Node,
    global_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
    db_connection: Connection,
):
    tag = await create_random_user_tag()
    await db_connection.execute(
        "update user_tag set comment = $1, group_tag = $2 where id = $3",
        "Blue Crew Alpha",
        "North Gate",
        tag.id,
    )

    search_terms = [
        "crew",
        "NORTH",
        "alpha gate",
    ]

    for search_term in search_terms:
        results = await user_tag_service.find_user_tags(
            token=global_admin_token,
            node_id=event_node.id,
            search_term=search_term,
        )
        found_tag = next((result_tag for result_tag in results if result_tag.id == tag.id), None)
        assert found_tag is not None, f"expected user tag match for search term {search_term!r}"


async def test_create_user_tags_with_hex_uid(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
    db_connection: Connection,
):
    """Test creating user tags with hex UIDs (simulating CSV import with hex conversion)."""
    import random

    # Test that we can create tags with hex UIDs (already converted to int by frontend)
    # The frontend converts hex strings to integers before sending to backend
    test_uids = [
        0x12345678,  # Hex value as integer
        0xABCDEF,  # Hex value as integer
        1234567890,  # Decimal value
    ]

    # Add random offset to avoid UID conflicts with existing tags
    random_offset = random.randint(1000000, 9999999)

    for base_uid in test_uids:
        # Add offset to make UID unique
        test_uid = base_uid + random_offset

        new_tag = NewUserTag(
            pin=f"test_pin_{test_uid}",
            secret_id=user_tag_secret,
            uid=test_uid,
            is_vip=False,
            comment=f"Test tag with UID {test_uid}",
        )

        # Create the tag
        await user_tag_service.create_user_tags(
            token=event_admin_token, node_id=event_node.id, new_user_tags=[new_tag]
        )

        # Verify the tag was created with correct UID
        created_tag = await db_connection.fetchrow(
            "select uid, pin from user_tag where uid = $1 and node_id = $2", test_uid, event_node.id
        )
        assert created_tag is not None
        assert created_tag["uid"] == test_uid
        assert created_tag["pin"] == f"test_pin_{test_uid}"


async def test_create_user_tags_same_pin_different_uids_allowed(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
    db_connection: Connection,
):
    """Same printed PIN may exist on multiple chips when UIDs differ."""
    import random

    shared_pin = "shared_pin_for_duplicate_print_test"
    base = random.randint(10_000_000_000_000_000, 89_999_999_999_999_999)
    uid_a = base + 1
    uid_b = base + 2
    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[
            NewUserTag(pin=shared_pin, secret_id=user_tag_secret, uid=uid_a, is_vip=False),
            NewUserTag(pin=shared_pin, secret_id=user_tag_secret, uid=uid_b, is_vip=False),
        ],
    )
    count = await db_connection.fetchval(
        "select count(*) from user_tag where pin = $1 and node_id = $2", shared_pin, event_node.id
    )
    assert count == 2


async def test_create_user_tags_rejects_two_unassigned_same_pin(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
):
    """At most one user_tag per PIN may have uid NULL in the tree."""
    shared_pin = "unassigned_dup_pin_test"
    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[NewUserTag(pin=shared_pin, secret_id=user_tag_secret, uid=None, is_vip=False)],
    )
    with pytest.raises((asyncpg.RaiseError, asyncpg.CheckViolationError), match="null uid is not unique"):
        await user_tag_service.create_user_tags(
            token=event_admin_token,
            node_id=event_node.id,
            new_user_tags=[NewUserTag(pin=shared_pin, secret_id=user_tag_secret, uid=None, is_vip=False)],
        )
