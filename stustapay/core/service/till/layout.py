from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.till import (
    NewTillButton,
    NewTillLayout,
    TillButton,
    TillLayout,
)
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.common.error import NotFound
from stustapay.core.service.user import AuthService


async def _fetch_till_layout(*, conn: Connection, node: Node, layout_id: int) -> TillLayout | None:
    return await conn.fetch_maybe_one(
        TillLayout,
        "select * from till_layout_with_buttons_and_tickets where id = $1 and node_id = any($2)",
        layout_id,
        node.ids_to_event_node,
    )


class TillLayoutService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_button(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, button: NewTillButton
    ) -> TillButton:
        row = await conn.fetchrow(
            "insert into till_button (node_id, name) values ($1, $2) returning id, name",
            node.id,
            button.name,
        )
        button_id = row["id"]

        for product_id in button.product_ids:
            await conn.execute(
                "insert into till_button_product (button_id, product_id) values ($1, $2)",
                button_id,
                product_id,
            )

        created_button = await conn.fetch_one(
            TillButton, "select * from till_button_with_products where id = $1", button_id
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_button_created,
            content=created_button,
            user_id=current_user.id,
            node_id=node.id,
        )
        return created_button

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_buttons(self, *, node: Node, conn: Connection) -> list[TillButton]:
        return await conn.fetch_many(
            TillButton,
            "select * from till_button_with_products where node_id = any($1) order by name",
            node.ids_to_event_node,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_button(self, *, conn: Connection, node: Node, button_id: int) -> Optional[TillButton]:
        return await conn.fetch_maybe_one(
            TillButton,
            "select * from till_button_with_products where id = $1 and node_id = any($2)",
            button_id,
            node.ids_to_event_node,
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_button(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, button_id: int, button: NewTillButton
    ) -> TillButton:
        row = await conn.fetchrow(
            "update till_button set name = $2 where id = $1 and node_id = $3 returning id, name",
            button_id,
            button.name,
            node.id,
        )
        if row is None:
            raise NotFound(element_type="button", element_id=button_id)
        await conn.execute("delete from till_button_product where button_id = $1", button_id)
        for product_id in button.product_ids:
            await conn.execute(
                "insert into till_button_product (button_id, product_id) values ($1, $2)",
                button_id,
                product_id,
            )
        updated_button = await conn.fetch_one(
            TillButton, "select * from till_button_with_products where id = $1", button_id
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_button_updated,
            content=updated_button,
            user_id=current_user.id,
            node_id=node.id,
        )
        return updated_button

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_button(self, *, conn: Connection, node: Node, current_user: CurrentUser, button_id: int) -> bool:
        result = await conn.execute("delete from till_button where id = $1 and node_id = $2", button_id, node.id)
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_button_deleted,
            content={"id": button_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_layout(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, layout: NewTillLayout
    ) -> TillLayout:
        till_layout_id = await conn.fetchval(
            "insert into till_layout (node_id, name, description) values ($1, $2, $3) returning id",
            node.id,
            layout.name,
            layout.description,
        )

        if layout.button_ids is not None:
            for idx, button_id in enumerate(layout.button_ids):
                await conn.execute(
                    "insert into till_layout_to_button (layout_id, button_id, sequence_number) values ($1, $2, $3)",
                    till_layout_id,
                    button_id,
                    idx,
                )

        if layout.ticket_ids is not None:
            for idx, ticket_id in enumerate(layout.ticket_ids):
                await conn.execute(
                    "insert into till_layout_to_ticket (layout_id, ticket_id, sequence_number) values ($1, $2, $3)",
                    till_layout_id,
                    ticket_id,
                    idx,
                )
        till_layout = await _fetch_till_layout(conn=conn, node=node, layout_id=till_layout_id)
        assert till_layout is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_layout_created,
            content=till_layout,
            user_id=current_user.id,
            node_id=node.id,
        )
        return till_layout

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_layouts(self, *, conn: Connection, node: Node) -> list[TillLayout]:
        return await conn.fetch_many(
            TillLayout,
            "select * from till_layout_with_buttons_and_tickets where node_id = any($1)",
            node.ids_to_event_node,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_layout(self, *, conn: Connection, node: Node, layout_id: int) -> Optional[TillLayout]:
        return await _fetch_till_layout(conn=conn, node=node, layout_id=layout_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_layout(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, layout_id: int, layout: NewTillLayout
    ) -> Optional[TillLayout]:
        till_layout_id = await conn.fetchval(
            "update till_layout set name = $2, description = $3 where id = $1 and node_id = $4 returning id",
            layout_id,
            layout.name,
            layout.description,
            node.id,
        )
        if till_layout_id is None:
            return None
        await conn.execute("delete from till_layout_to_button where layout_id = $1", layout_id)
        if layout.button_ids:
            for idx, button_id in enumerate(layout.button_ids):
                await conn.execute(
                    "insert into till_layout_to_button (layout_id, button_id, sequence_number) values ($1, $2, $3)",
                    layout_id,
                    button_id,
                    idx,
                )

        await conn.execute("delete from till_layout_to_ticket where layout_id = $1", layout_id)
        if layout.ticket_ids:
            for idx, ticket_id in enumerate(layout.ticket_ids):
                await conn.execute(
                    "insert into till_layout_to_ticket (layout_id, ticket_id, sequence_number) values ($1, $2, $3)",
                    layout_id,
                    ticket_id,
                    idx,
                )

        till_layout = await _fetch_till_layout(conn=conn, node=node, layout_id=layout_id)
        assert till_layout is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_layout_updated,
            content=till_layout,
            user_id=current_user.id,
            node_id=node.id,
        )
        return till_layout

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_layout(self, *, conn: Connection, node: Node, current_user: CurrentUser, layout_id: int) -> bool:
        result = await conn.execute("delete from till_layout where id = $1 and node_id = $2", layout_id, node.id)
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_layout_deleted,
            content={"id": layout_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"
