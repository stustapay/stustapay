# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import pytest
from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.tree import Node
from stustapay.core.service.account import AccountService

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
