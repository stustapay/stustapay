# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.service.account import AccountService
from stustapay.core.service.common.error import InvalidArgument, NotFound

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


async def test_switch_customer_tag(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    old_user_tag = await create_random_user_tag()
    new_user_tag = await create_random_user_tag()
    await db_connection.execute("update user_tag set uid = $2 where id = $1", new_user_tag.id, new_user_tag.uid)
    account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        old_user_tag.id,
    )

    await account_service.switch_customer_tag(
        token=event_admin_token,
        node_id=event_node.id,
        old_user_tag_pin=old_user_tag.pin,
        new_user_tag_pin=new_user_tag.pin,
        comment="swap comment",
    )

    acc = await account_service.get_account(token=event_admin_token, node_id=event_node.id, account_id=account_id)
    assert acc is not None
    assert new_user_tag.uid == acc.user_tag_uid
    assert 1 == len(acc.tag_history)
    assert "swap comment" == acc.tag_history[0].comment


async def test_switch_customer_tag_unknown_source_pin(
    account_service: AccountService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    new_user_tag = await create_random_user_tag()
    with pytest.raises(NotFound):
        await account_service.switch_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            old_user_tag_pin="unknown-pin",
            new_user_tag_pin=new_user_tag.pin,
            comment="swap comment",
        )


async def test_switch_customer_tag_unknown_target_pin(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    old_user_tag = await create_random_user_tag()
    await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        old_user_tag.id,
    )
    with pytest.raises(NotFound):
        await account_service.switch_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            old_user_tag_pin=old_user_tag.pin,
            new_user_tag_pin="unknown-pin",
            comment="swap comment",
        )


async def test_switch_customer_tag_target_already_assigned(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    old_user_tag = await create_random_user_tag()
    assigned_user_tag = await create_random_user_tag()
    await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        old_user_tag.id,
    )
    await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-2') returning id",
        event_node.id,
        assigned_user_tag.id,
    )
    with pytest.raises(InvalidArgument):
        await account_service.switch_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            old_user_tag_pin=old_user_tag.pin,
            new_user_tag_pin=assigned_user_tag.pin,
            comment="swap comment",
        )


async def test_switch_customer_tag_target_previously_used(
    account_service: AccountService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    old_user_tag = await create_random_user_tag()
    previously_used_tag = await create_random_user_tag()
    await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name) values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        old_user_tag.id,
    )
    await account_service.switch_customer_tag(
        token=event_admin_token,
        node_id=event_node.id,
        old_user_tag_pin=old_user_tag.pin,
        new_user_tag_pin=previously_used_tag.pin,
        comment="first swap",
    )
    with pytest.raises(InvalidArgument):
        await account_service.switch_customer_tag(
            token=event_admin_token,
            node_id=event_node.id,
            old_user_tag_pin=previously_used_tag.pin,
            new_user_tag_pin=old_user_tag.pin,
            comment="second swap",
        )
