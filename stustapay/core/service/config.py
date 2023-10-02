import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry, PublicConfig
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction
from stustapay.core.service.common.error import NotFound
from stustapay.framework.database import Connection


async def get_currency_identifier(*, conn: Connection) -> str:
    return await conn.fetchval("select value from config where key = 'currency.identifier' limit 1")


class ConfigService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    async def get_public_config(self) -> PublicConfig:
        return PublicConfig(
            test_mode=self.cfg.core.test_mode,
            test_mode_message=self.cfg.core.test_mode_message,
            sumup_topup_enabled_globally=self.cfg.customer_portal.sumup_config.enabled,
        )

    @with_db_transaction
    @requires_user([Privilege.config_management])
    async def list_config_entries(self, *, conn: Connection) -> list[ConfigEntry]:
        return await conn.fetch_many(ConfigEntry, "select * from config")

    @with_db_transaction
    @requires_user([Privilege.config_management])
    async def set_config_entry(self, *, conn: Connection, entry: ConfigEntry) -> ConfigEntry:
        fetched_entry = await conn.fetch_maybe_one(
            ConfigEntry, "update config set value = $2 where key = $1 returning key, value", entry.key, entry.value
        )
        if fetched_entry is None:
            raise NotFound("config", entry.key)
        return fetched_entry
