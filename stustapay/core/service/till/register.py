from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import ACCOUNT_CASH_VAULT, Account
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.till import CashRegisterStocking, NewCashRegisterStocking, CashRegister, NewCashRegister
from stustapay.core.schema.user import Privilege, CurrentUser
from stustapay.core.service.account import (
    get_account_by_id,
    get_transport_account_by_tag_uid,
)
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    with_db_transaction,
    requires_user,
    requires_terminal,
    with_retryable_db_transaction,
)
from stustapay.core.service.common.error import NotFound, InvalidArgument
from stustapay.core.service.order.booking import BookingIdentifier, book_money_transfer
from stustapay.core.service.transaction import book_transaction

VIRTUAL_TILL_ID = 1


async def get_cash_register(conn: asyncpg.Connection, register_id: int) -> Optional[CashRegister]:
    row = await conn.fetchrow("select * from cash_register_with_cashier where id = $1", register_id)
    if row is None:
        return None
    return CashRegister.parse_obj(row)


async def create_cash_register(*, conn: asyncpg.Connection, new_register: NewCashRegister) -> CashRegister:
    register_id = await conn.fetchval("insert into cash_register (name) values ($1) returning id", new_register.name)
    register = await get_cash_register(conn=conn, register_id=register_id)
    assert register is not None
    return register


class TillRegisterService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @staticmethod
    async def _list_cash_register_stockings(*, conn: asyncpg.Connection) -> list[CashRegisterStocking]:
        rows = await conn.fetch("select * from cash_register_stocking")
        return [CashRegisterStocking.parse_obj(row) for row in rows]

    @staticmethod
    async def _get_cash_register_stocking(
        *, conn: asyncpg.Connection, stocking_id: int
    ) -> Optional[CashRegisterStocking]:
        row = await conn.fetchrow("select * from cash_register_stocking where id = $1", stocking_id)
        if row is None:
            return None
        return CashRegisterStocking.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def list_cash_register_stockings_admin(self, *, conn: asyncpg.Connection) -> list[CashRegisterStocking]:
        return await self._list_cash_register_stockings(conn=conn)

    @with_db_transaction
    @requires_terminal()
    async def list_cash_register_stockings_terminal(self, *, conn: asyncpg.Connection) -> list[CashRegisterStocking]:
        return await self._list_cash_register_stockings(conn=conn)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def create_cash_register_stockings(
        self, *, conn: asyncpg.Connection, stocking: NewCashRegisterStocking
    ) -> CashRegisterStocking:
        stocking_id = await conn.fetchval(
            "insert into cash_register_stocking "
            "   (euro200, euro100, euro50, euro20, euro10, euro5, euro2, euro1, "
            "   cent50, cent20, cent10, cent5, cent2, cent1, variable_in_euro, name) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) "
            "returning id",
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
        updated = await self._get_cash_register_stocking(conn=conn, stocking_id=stocking_id)
        assert updated is not None
        return updated

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def update_cash_register_stockings(
        self, *, conn: asyncpg.Connection, stocking_id: int, stocking: NewCashRegisterStocking
    ) -> CashRegisterStocking:
        stocking_id = await conn.fetchval(
            "update cash_register_stocking set "
            "   euro200 = $1, euro100 = $2, euro50 = $3, euro20 = $4, euro10 = $5, euro5 = $6, euro2 = $7, "
            "   euro1 = $8, cent50 = $9, cent20 = $10, cent10 = $11, cent5 = $12, cent2 = $13, cent1 = $14, "
            "variable_in_euro = $15, name = $16 where id = $17 returning id",
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
        )
        if stocking_id is None:
            raise NotFound(element_typ="cash_register_stocking", element_id=str(stocking_id))
        updated = await self._get_cash_register_stocking(conn=conn, stocking_id=stocking_id)
        assert updated is not None
        return updated

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def delete_cash_register_stockings(self, *, conn: asyncpg.Connection, stocking_id: int):
        result = await conn.execute(
            "delete from cash_register_stocking where id = $1",
            stocking_id,
        )
        return result != "DELETE 0"

    @staticmethod
    async def _list_cash_registers(*, conn: asyncpg.Connection, hide_assigned_registers: bool) -> list[CashRegister]:
        if hide_assigned_registers:
            rows = await conn.fetch("select * from cash_register_with_cashier where current_cashier_id is null")
        else:
            rows = await conn.fetch("select * from cash_register_with_cashier")
        return [CashRegister.parse_obj(row) for row in rows]

    @with_db_transaction
    @requires_terminal([Privilege.till_management])
    async def list_cash_registers_terminal(
        self, *, conn: asyncpg.Connection, hide_assigned_registers=False
    ) -> list[CashRegister]:
        return await self._list_cash_registers(conn=conn, hide_assigned_registers=hide_assigned_registers)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def list_cash_registers_admin(
        self, *, conn: asyncpg.Connection, hide_assigned_registers=False
    ) -> list[CashRegister]:
        return await self._list_cash_registers(conn=conn, hide_assigned_registers=hide_assigned_registers)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def create_cash_register(self, *, conn: asyncpg.Connection, new_register: NewCashRegister) -> CashRegister:
        return await create_cash_register(conn=conn, new_register=new_register)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def update_cash_register(
        self, *, conn: asyncpg.Connection, register_id: int, register: NewCashRegister
    ) -> CashRegister:
        row = await conn.fetchrow(
            "update cash_register set name = $2 where id = $1 returning id, name", register_id, register.name
        )
        if row is None:
            raise NotFound(element_typ="cash_register", element_id=str(register_id))
        r = await get_cash_register(conn=conn, register_id=register_id)
        assert r is not None
        return r

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def delete_cash_register(self, *, conn: asyncpg.Connection, register_id: int):
        result = await conn.execute(
            "delete from cash_register where id = $1",
            register_id,
        )
        return result != "DELETE 0"

    @with_retryable_db_transaction()
    @requires_terminal([Privilege.cashier_management])
    async def stock_up_cash_register(
        self,
        *,
        conn: asyncpg.Connection,
        current_user: CurrentUser,
        stocking_id: int,
        cashier_tag_uid: int,
        cash_register_id: int,
    ) -> bool:
        register_stocking = await self._get_cash_register_stocking(conn=conn, stocking_id=stocking_id)
        if register_stocking is None:
            raise InvalidArgument("cash register stocking template does not exist")

        row = await conn.fetchrow(
            "select id, cashier_account_id, cash_register_id from usr where user_tag_uid = $1", cashier_tag_uid
        )
        if row is None:
            raise InvalidArgument("Cashier does not have a cash register")
        cashier_account_id = row["cashier_account_id"]
        if row["cash_register_id"] is not None:
            raise InvalidArgument("cashier already has a cash register")

        user_id = row["id"]
        is_logged_in = await conn.fetchval(
            "select true from till join usr u on till.active_user_id = u.id where u.id = $1", user_id
        )
        if is_logged_in:
            raise InvalidArgument("Cannot stop up cash register if cashier is logged in at till")

        await conn.fetchval("update usr set cash_register_id = $1 where id = $2", cash_register_id, user_id)

        await book_transaction(
            conn=conn,
            description=f"cash register stock up using template: {register_stocking.name}",
            source_account_id=ACCOUNT_CASH_VAULT,
            target_account_id=cashier_account_id,
            amount=register_stocking.total,
            conducting_user_id=current_user.id,
        )
        return True

    @with_retryable_db_transaction()
    @requires_terminal([Privilege.cashier_management])
    async def modify_cashier_account_balance(
        self,
        *,
        conn: asyncpg.Connection,
        current_terminal: Terminal,
        current_user: CurrentUser,
        cashier_tag_uid: int,
        amount: float,
    ):
        row = await conn.fetchrow(
            "select usr.cash_register_id, a.* "
            "from usr "
            "join till t on usr.id = t.active_user_id "
            "join account_with_history a on usr.cashier_account_id = a.id "
            "where usr.user_tag_uid = $1",
            cashier_tag_uid,
        )
        if row is None:
            raise InvalidArgument("Cashier does not exists or is not logged in at a terminal")

        cashier_account = Account.parse_obj(row)
        cash_register_id = row["cash_register_id"]
        if cash_register_id is None:
            raise InvalidArgument("Cashier does not have a cash register")

        if cashier_account.balance + amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on cashier account. Current balance is {cashier_account.balance}."
            )

        assert current_user.transport_account_id is not None
        transport_account = await get_account_by_id(conn=conn, account_id=current_user.transport_account_id)
        assert transport_account is not None

        if transport_account.balance - amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on transport account. Current balance is {transport_account.balance}"
            )

        bookings: dict[BookingIdentifier, float] = {
            BookingIdentifier(source_account_id=transport_account.id, target_account_id=cashier_account.id): amount
        }

        await book_money_transfer(
            conn=conn,
            originating_user_id=current_user.id,
            till_id=current_terminal.till.id,
            bookings=bookings,
            cash_register_id=cash_register_id,
            amount=amount,
        )

    @with_retryable_db_transaction()
    @requires_terminal([Privilege.cashier_management])
    async def modify_transport_account_balance(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, orga_tag_uid: int, amount: float
    ):
        transport_account = await get_transport_account_by_tag_uid(conn=conn, orga_tag_uid=orga_tag_uid)
        if transport_account is None:
            raise InvalidArgument("Transport account could not be found")

        if transport_account.balance + amount < 0:
            raise InvalidArgument(
                f"Insufficient balance on transport account. Current balance is {transport_account.balance}."
            )

        await book_transaction(
            conn=conn,
            description="transport account balance modification",
            source_account_id=ACCOUNT_CASH_VAULT,
            target_account_id=transport_account.id,
            amount=amount,
            conducting_user_id=current_user.id,
        )

    @staticmethod
    async def _transfer_cash_register(
        conn: asyncpg.Connection, source_cashier_id: int, target_cashier_id: int
    ) -> CashRegister:
        source_cashier = await conn.fetchrow(
            "select t.id as till_id, usr.id as cashier_id, usr.cash_register_id, usr.cashier_account_id, a.balance "
            "from usr "
            "left join till t on t.active_user_id = usr.id "
            "left join account a on usr.cashier_account_id = a.id "
            "where usr.id = $1",
            source_cashier_id,
        )
        if source_cashier is None:
            raise InvalidArgument("The cashier from whom to transfer the cash register does not exist")

        if source_cashier["till_id"] is not None:
            raise InvalidArgument(
                "The cashier from whom to transfer the cash register is still logged in at a terminal"
            )
        if source_cashier["cash_register_id"] is None:
            raise InvalidArgument("The cashier from whom to transfer the cash register does not have a cash register")
        if source_cashier["cashier_account_id"] is None:
            raise InvalidArgument("The cashier from whom to transfer the cash register is not cashier")

        target_cashier = await conn.fetchrow(
            "select t.id as till_id, usr.cash_register_id, usr.cashier_account_id "
            "from usr left join till t on t.active_user_id = usr.id where usr.id = $1",
            target_cashier_id,
        )
        if target_cashier is None:
            raise InvalidArgument("The cashier to whom to transfer the cash register does not exist")
        if target_cashier["till_id"] is not None:
            raise InvalidArgument("The cashier to whom to transfer the cash register is still logged in at a terminal")
        if target_cashier["cash_register_id"] is not None:
            raise InvalidArgument("The cashier to whom to transfer the cash register already has a cash register")
        if target_cashier["cashier_account_id"] is None:
            raise InvalidArgument("The cashier to whom to transfer the cash register is not cashier")

        await book_transaction(
            conn=conn,
            source_account_id=source_cashier["cashier_id"],
            target_account_id=target_cashier["cashier_account_id"],
            amount=source_cashier["balance"],
            conducting_user_id=source_cashier["cashier_id"],
        )

        await conn.execute("update usr set cash_register_id = null where id = $1", source_cashier_id)
        await conn.execute(
            "update usr set cash_register_id = $2 where id = $1",
            target_cashier_id,
            source_cashier["cash_register_id"],
        )
        reg = await get_cash_register(conn=conn, register_id=source_cashier["cash_register_id"])
        assert reg is not None
        return reg

    @with_retryable_db_transaction()
    @requires_user([Privilege.cashier_management])
    async def transfer_cash_register_admin(
        self, *, conn: asyncpg.Connection, source_cashier_id: int, target_cashier_id: int
    ) -> CashRegister:
        return await self._transfer_cash_register(
            conn=conn, source_cashier_id=source_cashier_id, target_cashier_id=target_cashier_id
        )

    @with_retryable_db_transaction()
    @requires_terminal()
    async def transfer_cash_register_terminal(
        self, *, conn: asyncpg.Connection, source_cashier_tag_uid: int, target_cashier_tag_uid: int
    ):
        source_cashier_id = await conn.fetchval("select id from usr where user_tag_uid = $1", source_cashier_tag_uid)
        target_cashier_id = await conn.fetchval("select id from usr where user_tag_uid = $1", target_cashier_tag_uid)
        return await self._transfer_cash_register(
            conn=conn, source_cashier_id=source_cashier_id, target_cashier_id=target_cashier_id
        )
