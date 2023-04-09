# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.service.config import ConfigService
from .common import BaseTestCase


class ConfigServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_config_workflow(self):
        configs = await self.config_service.list_config_entries(token=self.admin_token)
        self.assertTrue(len(configs) > 0)
        config = list(filter(lambda x: x.key == "currency.symbol", configs))
        self.assertEqual(len(config), 1)
