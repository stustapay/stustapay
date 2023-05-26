import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry, PublicConfig
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction
from stustapay.core.service.common.error import NotFound


async def get_currency_identifier(*, conn: asyncpg.Connection) -> str:
    return await conn.fetchval("select value from config where key = 'currency.identifier' limit 1")


class ConfigService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    async def is_sumup_topup_enabled(self, *, conn: asyncpg.Connection) -> bool:
        db_config_entry = await conn.fetchval("select value from config where key = 'sumup_topup.enabled'")
        return self.cfg.customer_portal.sumup_config.enabled and db_config_entry == "true"

    @with_db_transaction
    async def get_public_config(self, *, conn: asyncpg.Connection) -> PublicConfig:
        row = await conn.fetchrow(
            "select "
            "   (select value from config where key = 'currency.symbol') as currency_symbol,"
            "   (select value from config where key = 'currency.identifier') as currency_identifier"
        )

        return PublicConfig(
            currency_symbol=row["currency_symbol"],
            currency_identifier=row["currency_identifier"],
            test_mode=self.cfg.core.test_mode,
            test_mode_message=self.cfg.core.test_mode_message,
            sumup_topup_enabled=await self.is_sumup_topup_enabled(conn=conn),
        )

    @with_db_transaction
    @requires_user([Privilege.config_management])
    async def list_config_entries(self, *, conn: asyncpg.Connection) -> list[ConfigEntry]:
        cursor = conn.cursor("select * from config")
        result = []
        async for row in cursor:
            result.append(ConfigEntry.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.config_management])
    async def set_config_entry(self, *, conn: asyncpg.Connection, entry: ConfigEntry) -> ConfigEntry:
        row = await conn.fetchrow(
            "update config set value = $2 where key = $1 returning key, value", entry.key, entry.value
        )
        if row is None:
            raise NotFound("config", entry.key)

        return ConfigEntry.parse_obj(row)
