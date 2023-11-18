# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUser
from stustapay.core.service.account import AccountService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import UserTagService
from stustapay.framework.database import Connection

from .conftest import CreateRandomUserTag


async def test_switch_user_tag(
    user_service: UserService,
    user_tag_service: UserTagService,
    account_service: AccountService,
    db_connection: Connection,
    event_node: Node,
    admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    new_user_tag = await create_random_user_tag()
    user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(login="test-user", display_name="test-user", user_tag_uid=user_tag.uid, role_names=[]),
    )
    account_id = await db_connection.fetchval("select id from account where user_tag_uid = $1", user_tag.uid)

    acc = await account_service.get_account(token=admin_token, account_id=account_id)
    assert acc is not None
    assert user_tag.uid == acc.user_tag_uid
    await account_service.switch_account_tag_uid_admin(
        token=admin_token, account_id=account_id, new_user_tag_uid=new_user_tag.uid, comment="foobar"
    )
    acc = await account_service.get_account(token=admin_token, account_id=account_id)
    assert acc is not None
    assert new_user_tag.uid == acc.user_tag_uid
    assert 1 == len(acc.tag_history)
    assert "foobar" == acc.tag_history[0].comment
    user = await user_service.get_user(token=admin_token, user_id=user.id)
    assert new_user_tag.uid == user.user_tag_uid

    user_tag_2 = await user_tag_service.get_user_tag_detail(token=admin_token, user_tag_uid=new_user_tag.uid)
    assert user_tag_2 is not None
    assert 0 == len(user_tag_2.account_history)

    user_tag_1 = await user_tag_service.get_user_tag_detail(token=admin_token, user_tag_uid=user_tag.uid)
    assert user_tag_1 is not None
    assert 1 == len(user_tag_1.account_history)
    assert acc.id == user_tag_1.account_history[0].account_id


async def test_account_comment_updates(
    account_service: AccountService,
    admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()
    account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_uid, type, name) "
        "values ($1, $2, 'private', 'account-1') returning id",
        event_node.id,
        user_tag.uid,
    )

    acc = await account_service.get_account(token=admin_token, account_id=account_id)
    assert acc is not None
    assert acc.comment is None

    await account_service.update_account_comment(token=admin_token, account_id=account_id, comment="foobar")
    acc = await account_service.get_account(token=admin_token, account_id=account_id)
    assert acc is not None
    assert "foobar" == acc.comment
