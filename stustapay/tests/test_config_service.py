# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.service.config import ConfigService

from .common import BaseTestCase


class ConfigServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_get_public_config(self):
        public_config = await self.config_service.get_public_config()
        self.assertIsNotNone(public_config)
