# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.service.user_tag import UserTagService

from .conftest import CreateRandomUserTag


async def test_user_tag_comment_updates(
    user_tag_service: UserTagService,
    admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()

    user_tag_detail = await user_tag_service.get_user_tag_detail(token=admin_token, user_tag_uid=user_tag.uid)
    assert user_tag_detail is not None
    assert user_tag_detail.comment is None

    await user_tag_service.update_user_tag_comment(token=admin_token, user_tag_uid=user_tag.uid, comment="foobar")
    user_tag_detail = await user_tag_service.get_user_tag_detail(token=admin_token, user_tag_uid=user_tag.uid)
    assert user_tag_detail is not None
    assert "foobar" == user_tag_detail.comment
