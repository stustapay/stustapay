from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.terminal import (
    TerminalProfile,
    NewTerminalProfile,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges
from stustapay.core.service.user import UserService


class TerminalProfileService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, user_service: UserService):
        super().__init__(db_pool, config)
        self.user_service = user_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_profile(self, *, conn: asyncpg.Connection, profile: NewTerminalProfile) -> TerminalProfile:
        row = await conn.fetchrow(
            "insert into terminal_profile (name, description, layout_id) values ($1, $2, $3) "
            "returning id, name, description, layout_id",
            profile.name,
            profile.description,
            profile.layout_id,
        )

        return TerminalProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_profiles(self, *, conn: asyncpg.Connection) -> list[TerminalProfile]:
        cursor = conn.cursor("select * from terminal_profile")
        result = []
        async for row in cursor:
            result.append(TerminalProfile.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_profile(self, *, conn: asyncpg.Connection, profile_id: int) -> Optional[TerminalProfile]:
        row = await conn.fetchrow("select * from terminal_profile where id = $1", profile_id)
        if row is None:
            return None

        return TerminalProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_profile(
        self, *, conn: asyncpg.Connection, profile_id: int, profile: NewTerminalProfile
    ) -> Optional[TerminalProfile]:
        row = await conn.fetchrow(
            "update terminal_profile set name = $2, description = $3, layout_id = $4 where id = $1 "
            "returning id, name, description, layout_id",
            profile_id,
            profile.name,
            profile.description,
            profile.layout_id,
        )
        if row is None:
            return None

        return TerminalProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_profile(self, *, conn: asyncpg.Connection, terminal_profile_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal_profile where id = $1",
            terminal_profile_id,
        )
        return result != "DELETE 0"
