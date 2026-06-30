import asyncpg
from sftkit.service import Service

from stustapay.core.config import Config
from stustapay.core.schema.config import PublicConfig
from stustapay.core.service.auth import AuthService


class ConfigService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    async def get_public_config(self) -> PublicConfig:
        return PublicConfig(
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
            sumup_topup_enabled_globally=self.config.core.sumup_enabled,
        )
