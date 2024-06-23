import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry, PublicConfig
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_user
from stustapay.core.service.common.error import NotFound


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

    @with_db_transaction(read_only=True)
    @requires_user(privileges=[Privilege.node_administration], node_required=False)
    async def list_config_entries(self, *, conn: Connection) -> list[ConfigEntry]:
        return await conn.fetch_many(ConfigEntry, "select * from config")

    @with_db_transaction
    @requires_user(privileges=[Privilege.node_administration], node_required=False)
    async def set_config_entry(self, *, conn: Connection, entry: ConfigEntry) -> ConfigEntry:
        fetched_entry = await conn.fetch_maybe_one(
            ConfigEntry, "update config set value = $2 where key = $1 returning key, value", entry.key, entry.value
        )
        if fetched_entry is None:
            raise NotFound("config", entry.key)
        return fetched_entry
