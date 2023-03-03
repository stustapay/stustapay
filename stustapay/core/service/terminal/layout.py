from typing import Optional

import asyncpg

from stustapay.core.schema.terminal import (
    TerminalLayout,
    NewTerminalLayout,
    NewTerminalButton,
    TerminalButton,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges


class TerminalLayoutService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_button(self, *, conn: asyncpg.Connection, button: NewTerminalButton) -> TerminalButton:
        row = await conn.fetchrow(
            "insert into terminal_button (name) values ($1) returning id, name",
            button.name,
        )
        button_id = row["id"]

        for product_id in button.product_ids:
            await conn.execute(
                "insert into terminal_button_product (button_id, product_id) values ($1, $2)",
                button_id,
                product_id,
            )

        result = await conn.fetchrow("select * from terminal_button_with_products where id = $1", button_id)
        return TerminalButton.parse_obj(result)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_buttons(self, *, conn: asyncpg.Connection) -> list[TerminalButton]:
        cursor = conn.cursor("select * from terminal_button_with_products")
        result = []
        async for row in cursor:
            result.append(TerminalButton.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_button(self, *, conn: asyncpg.Connection, button_id: int) -> Optional[TerminalButton]:
        row = await conn.fetchrow("select * from terminal_button_with_products where id = $1", button_id)
        if row is None:
            return None

        return TerminalButton.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_button(
        self, *, conn: asyncpg.Connection, button_id: int, button: NewTerminalButton
    ) -> Optional[TerminalButton]:
        row = await conn.fetchrow(
            "update terminal_button set name = $2 where id = $1 returning id, name",
            button_id,
            button.name,
        )
        if row is None:
            return None
        await conn.execute("delete from terminal_button_product where button_id = $1", button_id)
        for product_id in button.product_ids:
            await conn.execute(
                "insert into terminal_button_product (button_id, product_id) values ($1, $2)",
                button_id,
                product_id,
            )
        row = await conn.fetchrow("select * from terminal_button_with_products where id = $1", button_id)

        return TerminalButton.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_button(self, *, conn: asyncpg.Connection, button_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal_button where id = $1",
            button_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_layout(self, *, conn: asyncpg.Connection, layout: NewTerminalLayout) -> TerminalLayout:
        row = await conn.fetchrow(
            "insert into terminal_layout (name, description) values ($1, $2) returning id, name, description",
            layout.name,
            layout.description,
        )
        layout_id = row["id"]

        if layout.button_ids is not None:
            for idx, button_id in enumerate(layout.button_ids):
                await conn.execute(
                    "insert into terminal_layout_to_button (layout_id, button_id, sequence_number) values ($1, $2, $3)",
                    layout_id,
                    button_id,
                    idx,
                )

        return TerminalLayout.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_layouts(self, *, conn: asyncpg.Connection) -> list[TerminalLayout]:
        cursor = conn.cursor("select * from terminal_layout_with_buttons")
        result = []
        async for row in cursor:
            result.append(TerminalLayout.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_layout(self, *, conn: asyncpg.Connection, layout_id: int) -> Optional[TerminalLayout]:
        row = await conn.fetchrow("select * from terminal_layout_with_buttons where id = $1", layout_id)
        if row is None:
            return None

        return TerminalLayout.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_layout(
        self, *, conn: asyncpg.Connection, layout_id: int, layout: NewTerminalLayout
    ) -> Optional[TerminalLayout]:
        row = await conn.fetchrow(
            "update terminal_layout set name = $2, description = $3 where id = $1 returning id, name, description",
            layout_id,
            layout.name,
            layout.description,
        )
        if row is None:
            return None
        await conn.execute("delete from terminal_layout_to_button where layout_id = $1", layout_id)
        if layout.button_ids:
            for idx, button_id in enumerate(layout.button_ids):
                await conn.execute(
                    "insert into terminal_layout_to_button (layout_id, button_id, sequence_number) values ($1, $2, $3)",
                    layout_id,
                    button_id,
                    idx,
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
