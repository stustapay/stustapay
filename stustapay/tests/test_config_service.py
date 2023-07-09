# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.config import ConfigEntry
from stustapay.core.service.config import ConfigService

from .common import BaseTestCase


class ConfigServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_config_workflow(self):
        entries = await self.config_service.list_config_entries(token=self.admin_token)
        self.assertEqual(len(list(filter(lambda x: x.key == "bon.issuer", entries))), 1)

        await self.config_service.set_config_entry(
            token=self.admin_token, entry=ConfigEntry(key="bon.issuer", value="foobar")
        )
        entries = await self.config_service.list_config_entries(token=self.admin_token)
        self.assertEqual(len(list(filter(lambda x: x.key == "bon.issuer", entries))), 1)
        self.assertEqual(list(filter(lambda x: x.key == "bon.issuer", entries))[0].value, "foobar")

    async def test_get_public_config(self):
        public_config = await self.config_service.get_public_config()
        self.assertIsNotNone(public_config)
