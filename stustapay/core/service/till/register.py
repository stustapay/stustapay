from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.terminal import CurrentTerminal
from stustapay.core.schema.till import (
    CashRegister,
    CashRegisterStocking,
    NewCashRegister,
    NewCashRegisterStocking,
    Till,
)
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.account import (
    get_account_by_id,
    get_system_account_for_node,
    get_transport_account_by_tag_uid,
)
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.order.booking import (
    BookingIdentifier,
    book_cashier_shift_end_order,
    book_cashier_shift_start_order,
    book_money_transfer,
)
from stustapay.core.service.till.common import create_cash_register, get_cash_register
from stustapay.core.service.transaction import book_transaction
from stustapay.core.service.tree.common import fetch_node


async def _list_cash_register_stockings(*, conn: Connection, node: Node) -> list[CashRegisterStocking]:
    return await conn.fetch_many(
        CashRegisterStocking,
        "select * from cash_register_stocking where node_id = any($1) order by name",
        node.ids_to_event_node,
    )


async def _get_cash_register_stocking(
    *, conn: Connection, node: Node, stocking_id: int
) -> Optional[CashRegisterStocking]:
    return await conn.fetch_maybe_one(
        CashRegisterStocking,
        "select * from cash_register_stocking where id = $1 and node_id = any($2)",
        stocking_id,
        node.ids_to_event_node,
    )


async def _list_cash_registers(*, conn: Connection, node: Node, hide_assigned_registers: bool) -> list[CashRegister]:
    if hide_assigned_registers:
        return await conn.fetch_many(
            CashRegister,
            "select * from cash_register_with_cashier "
            "where current_cashier_id is null and node_id = any($1) order by name",
            node.ids_to_event_node,
        )
    else:
        return await conn.fetch_many(
            CashRegister,
            "select * from cash_register_with_cashier where node_id = any($1) order by name",
            node.ids_to_event_node,
        )


async def _select_till_for_cash_register_insertion(conn: Connection, user_id: int, cash_register_id: int) -> int | None:
    tills = await conn.fetch(
        "select t.id, t.name from till t join terminal tm on t.terminal_id = tm.id join till_profile tp on t.active_profile_id = tp.id "
        "where tm.active_user_id = $1 and tp.enable_cash_payment",
        user_id,
    )
    if len(tills) == 0:  # nothing to do
        return None
    if len(tills) > 1:
        till_names = ", ".join([till["name"] for till in tills])
        raise InvalidArgument(
            f'Cannot assign cash register to cashier as it is not clear which till should be used for the cash register. User is logged in at the following tills: "{till_names}".'
        )
    till_id = tills[0]["id"]
    await conn.execute("update till set active_cash_register_id = $1 where id = $2", till_id, cash_register_id)
    return till_id


class TillRegisterService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_cash_register_stockings_admin(self, *, conn: Connection, node: Node) -> list[CashRegisterStocking]:
        return await _list_cash_register_stockings(conn=conn, node=node)

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def list_cash_register_stockings_terminal(
        self, *, conn: Connection, current_till: CurrentTerminal
    ) -> list[CashRegisterStocking]:
        node = await fetch_node(conn=conn, node_id=current_till.node_id)
        assert node is not None
        return await _list_cash_register_stockings(conn=conn, node=node)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_cash_register_stockings(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, stocking: NewCashRegisterStocking
    ) -> CashRegisterStocking:
        stocking_id = await conn.fetchval(
            "insert into cash_register_stocking "
            "   (node_id, euro200, euro100, euro50, euro20, euro10, euro5, euro2, euro1, "
            "   cent50, cent20, cent10, cent5, cent2, cent1, variable_in_euro, name) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) "
            "returning id",
            node.id,
            stocking.euro200,
            stocking.euro100,
            stocking.euro50,
            stocking.euro20,
            stocking.euro10,
            stocking.euro5,
            stocking.euro2,
            stocking.euro1,
            stocking.cent50,
            stocking.cent20,
            stocking.cent10,
            stocking.cent5,
            stocking.cent2,
            stocking.cent1,
            stocking.variable_in_euro,
            stocking.name,
        )
        updated = await _get_cash_register_stocking(conn=conn, node=node, stocking_id=stocking_id)
        assert updated is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_stocking_created,
            content=updated,
            user_id=current_user.id,
            node_id=node.id,
        )
        return updated

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_cash_register_stockings(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        stocking_id: int,
        stocking: NewCashRegisterStocking,
    ) -> CashRegisterStocking:
        stocking_id = await conn.fetchval(
            "update cash_register_stocking set "
            "   euro200 = $1, euro100 = $2, euro50 = $3, euro20 = $4, euro10 = $5, euro5 = $6, euro2 = $7, "
            "   euro1 = $8, cent50 = $9, cent20 = $10, cent10 = $11, cent5 = $12, cent2 = $13, cent1 = $14, "
            "variable_in_euro = $15, name = $16 where id = $17 and node_id = any($18) returning id",
            stocking.euro200,
            stocking.euro100,
            stocking.euro50,
            stocking.euro20,
            stocking.euro10,
            stocking.euro5,
            stocking.euro2,
            stocking.euro1,
            stocking.cent50,
            stocking.cent20,
            stocking.cent10,
            stocking.cent5,
            stocking.cent2,
            stocking.cent1,
            stocking.variable_in_euro,
            stocking.name,
            stocking_id,
            node.ids_to_event_node,
        )
        if stocking_id is None:
            raise NotFound(element_type="cash_register_stocking", element_id=str(stocking_id))
        updated = await _get_cash_register_stocking(conn=conn, node=node, stocking_id=stocking_id)
        assert updated is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_stocking_updated,
            content=updated,
            user_id=current_user.id,
            node_id=node.id,
        )
        return updated

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_cash_register_stockings(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, stocking_id: int
    ):
        result = await conn.execute(
            "delete from cash_register_stocking where id = $1 and node_id = $2", stocking_id, node.id
        )
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_stocking_deleted,
            content={"id": stocking_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_terminal([Privilege.node_administration], requires_till=False)
    async def list_cash_registers_terminal(
        self, *, conn: Connection, current_till: Till, hide_assigned_registers=False
    ) -> list[CashRegister]:
        node = await fetch_node(conn=conn, node_id=current_till.node_id)
        assert node is not None
        return await _list_cash_registers(conn=conn, node=node, hide_assigned_registers=hide_assigned_registers)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_cash_registers_admin(
        self, *, conn: Connection, node: Node, hide_assigned_registers=False
    ) -> list[CashRegister]:
        return await _list_cash_registers(conn=conn, node=node, hide_assigned_registers=hide_assigned_registers)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_cash_register_admin(self, *, conn: Connection, node: Node, register_id: int) -> CashRegister:
        return await get_cash_register(conn=conn, node=node, register_id=register_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_cash_register(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, new_register: NewCashRegister
    ) -> CashRegister:
        register = await create_cash_register(conn=conn, node=node, new_register=new_register)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_created,
            content=register,
            user_id=current_user.id,
            node_id=node.id,
        )
        return register

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_cash_register(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, register_id: int, register: NewCashRegister
    ) -> CashRegister:
        row = await conn.fetchrow(
            "update cash_register set name = $2 where id = $1 and node_id = $3 returning id, name",
            register_id,
            register.name,
            node.id,
        )
        if row is None:
            raise NotFound(element_type="cash_register", element_id=str(register_id))
        r = await get_cash_register(conn=conn, node=node, register_id=register_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_updated,
            content=r,
            user_id=current_user.id,
            node_id=node.id,
        )
        return r

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_cash_register(self, *, conn: Connection, node: Node, current_user: CurrentUser, register_id: int):
        result = await conn.execute("delete from cash_register where id = $1 and node_id = $2", register_id, node.id)
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_deleted,
            content={"id": register_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=False)
    @requires_terminal([Privilege.cash_transport])
    async def stock_up_cash_register(
        self,
        *,
        conn: Connection,
        current_user: CurrentUser,
        current_till: Till,
        cashier_tag_uid: int,
        cash_register_id: int,
        stocking_id: Optional[int],
    ) -> bool:
        node = await fetch_node(conn=conn, node_id=current_till.node_id)
        assert node is not None

        cash_register_account_id: int | None = await conn.fetchval(
            "select account_id from cash_register where id = $1 and node_id = any($2)",
            cash_register_id,
            node.ids_to_event_node,
        )
        if cash_register_account_id is None:
            raise InvalidArgument("Cash register does not exist")

        till_in_use = await conn.fetchrow(
            "select t.name from till t where t.active_cash_register_id = $1",
            cash_register_id,
        )
        if till_in_use is not None:
            raise InvalidArgument(f"Cash register is already in use at till {till_in_use['name']}")

        user_row = await conn.fetchrow(
            "select id, cash_register_id from user_with_tag where user_tag_uid = $1 and node_id = any($2)",
            cashier_tag_uid,
            node.ids_to_event_node,
        )
        if user_row is None:
            raise InvalidArgument("No cashier exists with the given user tag")
        if user_row["cash_register_id"] is not None:
            raise InvalidArgument("The cashier already has an assigned cash register")

        await conn.fetchval("update usr set cash_register_id = $1 where id = $2", cash_register_id, user_row["id"])

        await book_cashier_shift_start_order(
            conn=conn, cashier_id=user_row["id"], cash_register_id=cash_register_id, node=node
        )

        node = await fetch_node(conn=conn, node_id=current_till.node_id)
        assert node is not None
        cash_vault_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_vault)

        stock_up_amount = 0.0
        if stocking_id is not None:
            register_stocking = await _get_cash_register_stocking(conn=conn, node=node, stocking_id=stocking_id)
            if register_stocking is None:
                raise InvalidArgument("cash register stocking template does not exist")
            stock_up_amount = register_stocking.total
            await book_transaction(
                conn=conn,
                description=f"cash register stock up using template: {register_stocking.name}",
                source_account_id=cash_vault_acc.id,
                target_account_id=cash_register_account_id,
                amount=register_stocking.total,
                conducting_user_id=current_user.id,
            )

        till_id = await _select_till_for_cash_register_insertion(
            conn, user_id=user_row["id"], cash_register_id=cash_register_id
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_stocked_up,
            content={"cash_register_id": cash_register_id, "amount": stock_up_amount, "till_id": till_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return True

    @with_db_transaction(read_only=False)
    @requires_terminal([Privilege.cash_transport])
    async def modify_cashier_account_balance(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        cashier_tag_uid: int,
        amount: float,
    ):
        row = await conn.fetchrow(
            "select u.cash_register_id, t.id as till_id, cr.account_id as cash_register_account_id, cr.balance as cash_register_balance "
            "from user_with_tag u "
            "join terminal tm on tm.active_user_id = u.id "
            "join till t on tm.id = t.terminal_id "
            "join cash_register_with_balance cr on u.cash_register_id = cr.id "
            "where u.user_tag_uid = $1 and u.node_id = any($2)",
            cashier_tag_uid,
            node.ids_to_event_node,
        )
        if row is None:
            raise InvalidArgument(
                "Cashier does not exists or is not logged in at a terminal or does not have a cash register assigned"
            )

        cash_register_balance = row["cash_register_balance"]
        cash_register_account_id = row["cash_register_account_id"]
        cash_register_id = row["cash_register_id"]

        if cash_register_balance + amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on cashier account. Current balance is {cash_register_balance}."
            )

        assert current_user.transport_account_id is not None
        transport_account = await get_account_by_id(conn=conn, node=node, account_id=current_user.transport_account_id)
        assert transport_account is not None

        if transport_account.balance - amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on transport account. Current balance is {transport_account.balance}"
            )

        bookings: dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=transport_account.id, target_account_id=cash_register_account_id
            ): amount
        }

        # till_id is the till of the cashier, not the finanzorga!
        await book_money_transfer(
            conn=conn,
            node=node,
            originating_user_id=current_user.id,
            till_id=row["till_id"],
            bookings=bookings,
            cash_register_id=cash_register_id,
            amount=amount,
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cashier_account_balance_changed,
            content={
                "cash_register_id": cash_register_id,
                "amount": amount,
                "cashier_till_id": row["till_id"],
                "transport_account_id": transport_account.id,
            },
            user_id=current_user.id,
            node_id=node.id,
        )

    @with_db_transaction(read_only=False)
    @requires_terminal([Privilege.cash_transport])
    async def modify_transport_account_balance(
        self,
        *,
        conn: Connection,
        current_user: CurrentUser,
        node: Node,
        orga_tag_uid: int,
        amount: float,
    ):
        transport_account = await get_transport_account_by_tag_uid(conn=conn, node=node, orga_tag_uid=orga_tag_uid)
        if transport_account is None:
            raise InvalidArgument("Transport account could not be found")

        if transport_account.balance + amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on transport account. Current balance is {transport_account.balance}."
            )

        cash_vault_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_vault)

        await book_transaction(
            conn=conn,
            description="transport account balance modification",
            source_account_id=cash_vault_acc.id,
            target_account_id=transport_account.id,
            amount=amount,
            conducting_user_id=current_user.id,
        )
        await create_audit_log(
            conn=conn,
            log_type=AuditType.transport_account_balance_changed,
            content={"amount": amount, "transport_account_id": transport_account.id},
            user_id=current_user.id,
            node_id=node.id,
        )

    @staticmethod
    async def _transfer_cash_register(
        conn: Connection, node: Node, source_cashier_id: int, target_cashier_id: int, originating_user_id: int
    ) -> CashRegister:
        if source_cashier_id == target_cashier_id:
            raise InvalidArgument("Cashiers must differ")

        source_cashier = await conn.fetchrow(
            "select usr.cash_register_id from usr where usr.id = $1 and usr.node_id = any($2)",
            source_cashier_id,
            node.ids_to_event_node,
        )
        if source_cashier is None:
            raise InvalidArgument("The cashier from whom to transfer the cash register does not exist")

        cash_register_id = source_cashier["cash_register_id"]
        if cash_register_id is None:
            raise InvalidArgument("The cashier from whom to transfer the cash register does not have a cash register")

        target_cashier = await conn.fetchrow(
            "select t.id as terminal_id, usr.cash_register_id "
            "from usr "
            "left join terminal t on t.active_user_id = usr.id "
            "where usr.id = $1 and usr.node_id = any($2)",
            target_cashier_id,
            node.ids_to_event_node,
        )
        if target_cashier is None:
            raise InvalidArgument("The cashier to whom to transfer the cash register does not exist")

        if target_cashier["terminal_id"] is not None:
            await _select_till_for_cash_register_insertion(
                conn=conn, user_id=target_cashier_id, cash_register_id=cash_register_id
            )

        if target_cashier["cash_register_id"] is not None:
            raise InvalidArgument("The cashier to whom to transfer the cash register already has a cash register")

        await conn.execute("update usr set cash_register_id = null where id = $1", source_cashier_id)
        await book_cashier_shift_end_order(
            conn=conn, cashier_id=source_cashier_id, cash_register_id=cash_register_id, node=node
        )
        await conn.execute(
            "update usr set cash_register_id = $2 where id = $1",
            target_cashier_id,
            cash_register_id,
        )
        await book_cashier_shift_start_order(
            conn=conn, cashier_id=target_cashier_id, cash_register_id=cash_register_id, node=node
        )
        await _select_till_for_cash_register_insertion(
            conn, user_id=target_cashier_id, cash_register_id=cash_register_id
        )

        reg = await get_cash_register(conn=conn, node=node, register_id=cash_register_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cash_register_transferred,
            content={
                "cash_register_id": cash_register_id,
                "source_cashier_id": source_cashier_id,
                "target_cashier_id": target_cashier_id,
            },
            user_id=originating_user_id,
            node_id=node.id,
        )
        return reg

    @with_db_transaction(read_only=False)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def transfer_cash_register_admin(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, source_cashier_id: int, target_cashier_id: int
    ) -> CashRegister:
        return await self._transfer_cash_register(
            conn=conn,
            node=node,
            source_cashier_id=source_cashier_id,
            target_cashier_id=target_cashier_id,
            originating_user_id=current_user.id,
        )

    @with_db_transaction(read_only=False)
    @requires_terminal()
    async def transfer_cash_register_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        source_cashier_tag_uid: int,
        target_cashier_tag_uid: int,
    ):
        source_cashier_id = await conn.fetchval(
            "select id from user_with_tag where user_tag_uid = $1 and node_id = any($2)",
            source_cashier_tag_uid,
            node.ids_to_event_node,
        )
        target_cashier_id = await conn.fetchval(
            "select id from user_with_tag where user_tag_uid = $1 and node_id = any($2)",
            target_cashier_tag_uid,
            node.ids_to_event_node,
        )
        return await self._transfer_cash_register(
            conn=conn,
            node=node,
            source_cashier_id=source_cashier_id,
            target_cashier_id=target_cashier_id,
            originating_user_id=source_cashier_id,
        )
