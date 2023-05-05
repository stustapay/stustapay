from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import ACCOUNT_CASH_VAULT
from stustapay.core.schema.till import CashRegisterStocking, NewCashRegisterStocking
from stustapay.core.schema.user import Privilege, CurrentUser
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user, requires_terminal
from stustapay.core.service.common.error import NotFound, InvalidArgument


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

    @with_db_transaction
    @requires_terminal([Privilege.cashier_management])
    async def stock_up_cash_register(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, stocking_id: int, cashier_tag_uid: int
    ) -> bool:
        register_stocking = await self._get_cash_register_stocking(conn=conn, stocking_id=stocking_id)
        if register_stocking is None:
            raise InvalidArgument("cash register stocking template does not exist")

        cashier_account_id = await conn.fetchval(
            "select cashier_account_id from usr where user_tag_uid = $1", cashier_tag_uid
        )
        if cashier_account_id is None:
            raise InvalidArgument("Cashier does not have a cash register")

        await conn.fetchval(
            "select * from book_transaction("
            "   order_id => null,"
            "   description => $1,"
            "   source_account_id => $2,"
            "   target_account_id => $3,"
            "   amount => $4,"
            "   vouchers_amount => 0,"
            "   conducting_user_id => $5)",
            f"cash register stock up using template: {register_stocking.name}",
            ACCOUNT_CASH_VAULT,
            cashier_account_id,
            register_stocking.total,
            current_user.id,
        )
        return True
