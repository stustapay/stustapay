import asyncpg

from .dbservice import DBService, with_db_transaction, requires_user_privileges
from stustapay.core.schema.user import Privilege
from stustapay.core.schema.config import ConfigEntry
from .error import NotFoundException


class ConfigService(DBService):
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
