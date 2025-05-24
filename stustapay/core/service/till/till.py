from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.order import Order
from stustapay.core.schema.terminal import CurrentTerminal
from stustapay.core.schema.till import NewTill, Till
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege, format_user_tag_uid
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.till.common import create_till, fetch_till
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.till.register import TillRegisterService
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user import AuthService


async def logout_user_from_terminal(conn: Connection, node_id: int, terminal_id: int):
    result = await conn.fetchval(
        "update terminal set active_user_id = null, active_user_role_id = null "
        "where id = $1 and node_id = $2 returning id",
        terminal_id,
        node_id,
    )
    if result is None:
        raise InvalidArgument("till does not exist")


async def remove_terminal_from_till(conn: Connection, node_id: int, till_id: int):
    result = await conn.fetchrow("select id, terminal_id from till where id = $1 and node_id = $2", till_id, node_id)
    if result is None:
        raise InvalidArgument("till does not exist")
    await conn.fetchval(
        "update till set terminal_id = null where id = $1 returning id",
        till_id,
    )
    terminal_id = result["terminal_id"]
    if terminal_id is not None:
        await logout_user_from_terminal(conn=conn, node_id=node_id, terminal_id=terminal_id)


async def assign_till_to_terminal(conn: Connection, node: Node, till_id: int, terminal_id: int):
    till = await fetch_till(conn=conn, node=node, till_id=till_id)
    assert till is not None
    if till.terminal_id is not None:
        raise InvalidArgument(f"Till {till.name} already has a terminal assigned")
    await conn.execute("update till set terminal_id = $1 where id = $2", terminal_id, till_id)


async def assign_cash_register_to_till_if_available(conn: Connection, till_id: int, cash_register_id: int):
    is_in_use = await conn.fetchval(
        "select exists(select from till where active_cash_register_id = $1) ", cash_register_id
    )
    if is_in_use:
        return

    await conn.execute("update till set active_cash_register_id = $1 where id = $2", cash_register_id, till_id)


class TillService(Service[Config]):
    def __init__(
        self,
        db_pool: asyncpg.Pool,
        config: Config,
        auth_service: AuthService,
    ):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.profile = TillProfileService(db_pool, config, auth_service)
        self.layout = TillLayoutService(db_pool, config, auth_service)
        self.register = TillRegisterService(db_pool, config, auth_service)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_till(self, *, conn: Connection, node: Node, current_user: CurrentUser, till: NewTill) -> Till:
        new_till = await create_till(conn=conn, node_id=node.id, till=till)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_created,
            content=new_till,
            user_id=current_user.id,
            node_id=node.id,
        )
        return new_till

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_tills(self, *, node: Node, conn: Connection) -> list[Till]:
        return await conn.fetch_many(
            Till,
            "select t.* from till_with_cash_register t join node n on t.node_id = n.id "
            "where (t.node_id = any($1) or $2 = any(n.parent_ids)) and not t.is_virtual "
            "order by t.name",
            node.ids_to_event_node,
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_till(self, *, conn: Connection, node: Node, till_id: int) -> Optional[Till]:
        return await fetch_till(conn=conn, node=node, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_till(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, till_id: int, till: NewTill
    ) -> Till:
        row = await conn.fetchrow(
            "update till set name = $2, description = $3, active_shift = $4, active_profile_id = $5, terminal_id = $6 "
            "where id = $1 and node_id = $7 returning id",
            till_id,
            till.name,
            till.description,
            till.active_shift,
            till.active_profile_id,
            till.terminal_id,
            node.id,
        )
        if row is None:
            raise NotFound(element_type="till", element_id=till_id)

        updated_till = await fetch_till(conn=conn, node=node, till_id=till_id)
        assert updated_till is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_updated,
            content=updated_till,
            user_id=current_user.id,
            node_id=node.id,
        )
        return updated_till

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_till(self, *, conn: Connection, node: Node, current_user: CurrentUser, till_id: int) -> bool:
        result = await conn.execute("delete from till where id = $1 and node_id = $2", till_id, node.id)
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_deleted,
            content={"id": till_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def remove_from_terminal(self, *, conn: Connection, node: Node, current_user: CurrentUser, till_id: int):
        await remove_terminal_from_till(conn=conn, node_id=node.id, till_id=till_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_to_terminal_changed,
            content={"till_id": till_id, "new_terminal_id": None},
            user_id=current_user.id,
            node_id=node.id,
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def switch_terminal(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, till_id: int, new_terminal_id: int
    ):
        await remove_terminal_from_till(conn=conn, node_id=node.id, till_id=till_id)
        await assign_till_to_terminal(conn=conn, node=node, till_id=till_id, terminal_id=new_terminal_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.till_to_terminal_changed,
            content={"till_id": till_id, "new_terminal_id": new_terminal_id},
            user_id=current_user.id,
            node_id=node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_customer(
        self, *, conn: Connection, current_terminal: CurrentTerminal, customer_tag_uid: int
    ) -> Account:
        node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert node is not None
        customer = await conn.fetch_maybe_one(
            Account,
            "select * from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")
        return customer

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.customer_management], requires_till=False)
    async def get_customer_orders(self, *, conn: Connection, node: Node, customer_tag_uid: int) -> list[Order]:
        customer_id = await conn.fetchval(
            "select id from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer_id is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")

        orders = await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered((select array_agg(o.id) from ordr o where customer_account_id = $1), $2)",
            customer_id,
            node.event_node_id,
        )
        return orders
