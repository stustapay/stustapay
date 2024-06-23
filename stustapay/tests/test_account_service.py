# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from sftkit.database import Connection

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
