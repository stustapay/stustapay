from typing import Optional

import asyncpg

from stustapay.core.schema.terminal import (
    TerminalProfile,
    NewTerminalProfile,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges


class TerminalProfileService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_terminal_profile(
        self, *, conn: asyncpg.Connection, terminal_profile: NewTerminalProfile
    ) -> TerminalProfile:
        row = await conn.fetchrow(
            "insert into terminal_profile (name, description, layout_id) values ($1, $2, $3) "
            "returning id, name, description, layout_id",
            terminal_profile.name,
            terminal_profile.description,
            terminal_profile.layout_id,
        )

        return TerminalProfile.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_terminal_profiles(self, *, conn: asyncpg.Connection) -> list[TerminalProfile]:
        cursor = conn.cursor("select * from terminal_profile")
        result = []
        async for row in cursor:
            result.append(TerminalProfile.from_db(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_terminal_profile(
        self, *, conn: asyncpg.Connection, terminal_profile_id: int
    ) -> Optional[TerminalProfile]:
        row = await conn.fetchrow("select * from terminal_profile where id = $1", terminal_profile_id)
        if row is None:
            return None

        return TerminalProfile.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_terminal_profile(
        self, *, conn: asyncpg.Connection, terminal_profile_id: int, terminal_profile: NewTerminalProfile
    ) -> Optional[TerminalProfile]:
        row = await conn.fetchrow(
            "update terminal_profile set name = $2, description = $3, layout_id = $4 where id = $1 "
            "returning id, name, description, layout_id",
            terminal_profile_id,
            terminal_profile.name,
            terminal_profile.description,
            terminal_profile.layout_id,
        )
        if row is None:
            return None

        return TerminalProfile.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_terminal_profile(self, *, conn: asyncpg.Connection, terminal_profile_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal_profile where id = $1",
            terminal_profile_id,
        )
        return result != "DELETE 0"
