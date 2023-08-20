# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.service.user_tag import UserTagService

from .common import TerminalTestCase


class UserTagServiceTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.user_tag_service = UserTagService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_user_tag_comment_updates(self):
        await self.db_conn.execute("insert into user_tag (uid) values (1)")

        user_tag_detail = await self.user_tag_service.get_user_tag_detail(token=self.admin_token, user_tag_uid=1)
        self.assertIsNotNone(user_tag_detail)
        self.assertIsNone(user_tag_detail.comment)

        await self.user_tag_service.update_user_tag_comment(token=self.admin_token, user_tag_uid=1, comment="foobar")
        user_tag_detail = await self.user_tag_service.get_user_tag_detail(token=self.admin_token, user_tag_uid=1)
        self.assertIsNotNone(user_tag_detail)
        self.assertEqual("foobar", user_tag_detail.comment)
