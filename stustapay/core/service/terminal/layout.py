from typing import Optional

import asyncpg

from stustapay.core.schema.terminal import (
    TerminalLayout,
    NewTerminalLayout,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges


class TerminalLayoutService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_terminal_layout(
        self, *, conn: asyncpg.Connection, terminal_layout: NewTerminalLayout
    ) -> TerminalLayout:
        row = await conn.fetchrow(
            "insert into terminal_layout (name, description, config) values ($1, $2, $3) "
            "returning id, name, description, config",
            terminal_layout.name,
            terminal_layout.description,
            terminal_layout.config,
        )

        return TerminalLayout.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_terminal_layouts(self, *, conn: asyncpg.Connection) -> list[TerminalLayout]:
        cursor = conn.cursor("select * from terminal_layout")
        result = []
        async for row in cursor:
            result.append(TerminalLayout.from_db(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_terminal_layout(
        self, *, conn: asyncpg.Connection, terminal_layout_id: int
    ) -> Optional[TerminalLayout]:
        row = await conn.fetchrow("select * from terminal_layout where id = $1", terminal_layout_id)
        if row is None:
            return None

        return TerminalLayout.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_terminal_layout(
        self, *, conn: asyncpg.Connection, terminal_layout_id: int, terminal_layout: NewTerminalLayout
    ) -> Optional[TerminalLayout]:
        row = await conn.fetchrow(
            "update terminal_layout set name = $2, description = $3, config = $4 where id = $1 "
            "returning id, name, description, config",
            terminal_layout_id,
            terminal_layout.name,
            terminal_layout.description,
            terminal_layout.config,
        )
        if row is None:
            return None

        return TerminalLayout.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_terminal_layout(self, *, conn: asyncpg.Connection, terminal_layout_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal_layout where id = $1",
            terminal_layout_id,
        )
        return result != "DELETE 0"
