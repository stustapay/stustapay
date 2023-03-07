import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry
from stustapay.core.schema.user import Privilege
from .dbservice import DBService, with_db_transaction, requires_user_privileges
from .error import NotFoundException
from .user import UserService


class ConfigService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, user_service: UserService):
        super().__init__(db_pool, config)
        self.user_service = user_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_config_entries(self, *, conn: asyncpg.Connection) -> list[ConfigEntry]:
        cursor = conn.cursor("select * from config")
        result = []
        async for row in cursor:
            result.append(ConfigEntry.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def set_config_entry(self, *, conn: asyncpg.Connection, entry: ConfigEntry) -> ConfigEntry:
        row = await conn.fetchrow(
            "update config set value = $2 where key = $1 returning key, value",
        )
        if row is None:
            raise NotFoundException("config", entry.key)

        return ConfigEntry.parse_obj(row)
