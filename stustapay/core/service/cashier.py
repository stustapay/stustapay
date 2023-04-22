from datetime import datetime
from typing import Optional

import asyncpg
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.account import ACCOUNT_IMBALANCE, ACCOUNT_CASH_VAULT
from stustapay.core.schema.cashier import Cashier, CashierShift
from stustapay.core.schema.user import Privilege, User
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges
from .common.error import ServiceException, NotFound
from .user import AuthService


class InvalidCloseOutException(ServiceException):
    id = "InvalidCloseOut"
    description = "The cashier shift can't be closed out"


class CloseOut(BaseModel):
    comment: str
    actual_cash_drawer_balance: float


class CloseOutResult(BaseModel):
    cashier_id: int
    imbalance: float


class CashierService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin, Privilege.finanzorga])
    async def list_cashiers(self, *, conn: asyncpg.Connection) -> list[Cashier]:
        cursor = conn.cursor("select * from cashier")
        result = []
        async for row in cursor:
            result.append(Cashier.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin, Privilege.finanzorga])
    async def get_cashier(self, *, conn: asyncpg.Connection, cashier_id: int) -> Optional[Cashier]:
        row = await conn.fetchrow("select * from cashier where id = $1", cashier_id)
        if not row:
            return None
        return Cashier.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin, Privilege.finanzorga])
    async def get_cashier_shifts(
        self, *, conn: asyncpg.Connection, current_user: User, cashier_id: int
    ) -> list[CashierShift]:
        cashier = await self.get_cashier(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, cashier_id=cashier_id
        )
        if not cashier:
            raise NotFound(element_typ="cashier", element_id=cashier_id)
        cursor = conn.cursor("select * from cashier_shift where cashier_id = $1", cashier_id)
        result = []
        async for row in cursor:
            result.append(CashierShift.parse_obj(row))
        return result

    async def _get_current_cashier_shift_start(self, *, conn: asyncpg.Connection, cashier_id) -> Optional[datetime]:
        return await conn.fetchval(
            "select ordr.booked_at from ordr "
            "where ordr.cashier_id = $1 and ordr.booked_at > coalesce(("
            "   select cs.ended_at from cashier_shift cs "
            "   where cs.cashier_id = $1 order by ended_at desc limit 1"
            "), '1970-01-01'::timestamptz) "
            "order by ordr.booked_at asc limit 1",
            cashier_id,
        )

    @with_db_transaction
    @requires_user_privileges([Privilege.admin, Privilege.finanzorga])
    async def close_out_cashier(
        self, *, conn: asyncpg.Connection, current_user: User, cashier_id: int, close_out: CloseOut
    ) -> CloseOutResult:
        cashier = await self.get_cashier(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, cashier_id=cashier_id
        )

        # TODO: which way to compute this
        shift_start = await self._get_current_cashier_shift_start(conn=conn, cashier_id=cashier_id)
        if shift_start is None:
            raise InvalidCloseOutException("the cashier did not start a shift, no orders were booked")
        imbalance = close_out.actual_cash_drawer_balance - cashier.cash_drawer_balance

        shift_end = datetime.now()
        await conn.fetchval(
            "select * from book_transaction("
            "   order_id => null,"
            "   description => $1,"
            "   source_account_id => $2,"
            "   target_account_id => $3,"
            "   amount => $4,"
            "   vouchers_amount => 0,"
            "   booked_at => $5)",
            "Cashier close out cash vault booking",
            cashier.cashier_account_id,
            ACCOUNT_CASH_VAULT,
            close_out.actual_cash_drawer_balance,
            shift_end,
        )
        close_out_transaction_id = await conn.fetchval(
            "select * from book_transaction("
            "   order_id => null,"
            "   description => $1,"
            "   source_account_id => $2,"
            "   target_account_id => $3,"
            "   amount => $4,"
            "   vouchers_amount => 0,"
            "   booked_at => $5)",
            "Cashier close out imbalance booking",
            cashier.cashier_account_id,
            ACCOUNT_IMBALANCE,
            imbalance,
            shift_end,
        )
        await conn.execute(
            "insert into cashier_shift ("
            "   cashier_id, started_at, ended_at, final_cash_drawer_balance, final_cash_drawer_imbalance, "
            "   comment, close_out_transaction_id) "
            "values ($1, $2, $3, $4, $5, $6, $7)",
            cashier.id,
            shift_start,
            shift_end,
            cashier.cash_drawer_balance,
            imbalance,
            close_out.comment,
            close_out_transaction_id,
        )

        return CloseOutResult(cashier_id=cashier.id, imbalance=imbalance)
