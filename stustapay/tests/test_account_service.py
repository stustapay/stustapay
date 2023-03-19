# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.service.account import AccountService
from .common import BaseTestCase


class ConfigServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, user_service=self.user_service
        )

    async def test_basic_config_workflow(self):
        accounts = await self.account_service.list_accounts(token=self.admin_token)
        self.assertEqual(len(accounts), 6)
