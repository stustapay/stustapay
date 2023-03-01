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
    async def create_layout(self, *, conn: asyncpg.Connection, layout: NewTerminalLayout) -> TerminalLayout:
        row = await conn.fetchrow(
            "insert into terminal_layout (name, description) values ($1, $2) returning id, name, description",
            layout.name,
            layout.description,
        )
        layout_id = row["id"]

        if layout.products is not None:
            for product in layout.products:
                await conn.execute(
                    "insert into terminal_layout_products (product_id, layout_id, sequence_number) values ($1, $2, $3)",
                    product.product_id,
                    layout_id,
                    product.sequence_number,
                )

        return TerminalLayout.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_layouts(self, *, conn: asyncpg.Connection) -> list[TerminalLayout]:
        cursor = conn.cursor("select * from terminal_layout_with_products")
        result = []
        async for row in cursor:
            result.append(TerminalLayout.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_layout(self, *, conn: asyncpg.Connection, layout_id: int) -> Optional[TerminalLayout]:
        row = await conn.fetchrow("select * from terminal_layout_with_products where id = $1", layout_id)
        if row is None:
            return None

        return TerminalLayout.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_layout(
        self, *, conn: asyncpg.Connection, layout_id: int, layout: NewTerminalLayout
    ) -> Optional[TerminalLayout]:
        row = await conn.fetchrow(
            "update terminal_layout set name = $2, description = $3 where id = $1 " "returning id, name, description",
            layout_id,
            layout.name,
            layout.description,
        )
        if row is None:
            return None
        await conn.execute("delete from terminal_layout_products where layout_id = $1", layout_id)
        for product in layout.products:
            await conn.execute(
                "insert into terminal_layout_products (product_id, layout_id, sequence_number) values ($1, $2, $3)",
                product.product_id,
                layout_id,
                product.sequence_number,
            )

        return TerminalLayout.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_layout(self, *, conn: asyncpg.Connection, layout_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal_layout where id = $1",
            layout_id,
        )
        return result != "DELETE 0"
