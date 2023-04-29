# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.service.account import AccountService
from .common import BaseTestCase


class AccountServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                for user_tag_uid in range(1, 20):
                    await conn.execute("insert into user_tag (uid) values ($1)", user_tag_uid)
            self.account_id = await conn.fetchval(
                "insert into account(user_tag_uid, type, name) values (1, 'private', 'account-1') returning id"
            )

    async def test_switch_user_tag(self):
        acc = await self.account_service.get_account(token=self.admin_token, account_id=self.account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(1, acc.user_tag_uid)
        success = await self.account_service.switch_account_tag_uid_admin(
            token=self.admin_token, account_id=self.account_id, new_user_tag_uid=2
        )
        self.assertTrue(success)
        acc = await self.account_service.get_account(token=self.admin_token, account_id=self.account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(2, acc.user_tag_uid)
        n_history_entries = await self.db_pool.fetchval(
            "select count(*) from account_tag_association_history where account_id = $1", self.account_id
        )
        self.assertEqual(1, n_history_entries)
