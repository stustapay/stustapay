from datetime import datetime
from typing import Optional

import asyncpg
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.account import ACCOUNT_IMBALANCE, ACCOUNT_CASH_VAULT
from stustapay.core.schema.cashier import Cashier, CashierShift
from stustapay.core.schema.order import PaymentMethod, OrderType
from stustapay.core.schema.user import Privilege, User, CurrentUser
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user
from .common.error import ServiceException, NotFound
from .order.booking import book_order, BookingIdentifier, NewLineItem
from .product import fetch_money_transfer_product
from .till.register import VIRTUAL_TILL_ID
from .user import AuthService


class InvalidCloseOutException(ServiceException):
    id = "InvalidCloseOut"
    description = "The cashier shift can't be closed out"


class CloseOut(BaseModel):
    comment: str
    actual_cash_drawer_balance: float
    closing_out_user_id: int


class CloseOutResult(BaseModel):
    cashier_id: int
    imbalance: float


class CashierService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.cashier_management])
    async def list_cashiers(self, *, conn: asyncpg.Connection) -> list[Cashier]:
        cursor = conn.cursor("select * from cashier")
        result = []
        async for row in cursor:
            result.append(Cashier.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.cashier_management])
    async def get_cashier(self, *, conn: asyncpg.Connection, cashier_id: int) -> Optional[Cashier]:
        row = await conn.fetchrow("select * from cashier where id = $1", cashier_id)
        if not row:
            return None
        return Cashier.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.cashier_management])
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

    @staticmethod
    async def _get_current_cashier_shift_start(*, conn: asyncpg.Connection, cashier_id) -> Optional[datetime]:
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
    @requires_user([Privilege.cashier_management])
    async def close_out_cashier(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, cashier_id: int, close_out: CloseOut
    ) -> CloseOutResult:
        cashier = await self.get_cashier(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, cashier_id=cashier_id
        )

        is_logged_in = await conn.fetchval("select true from till where active_user_id = $1", cashier_id)
        if is_logged_in:
            raise InvalidCloseOutException("cannot close out a cashier who is logged in at a terminal")

        if cashier.cash_register_id is None:
            raise InvalidCloseOutException("cashier does not have a cash register assigned")

        # TODO: which way to compute this
        shift_start = await self._get_current_cashier_shift_start(conn=conn, cashier_id=cashier_id)
        if shift_start is None:
            raise InvalidCloseOutException("the cashier did not start a shift, no orders were booked")
        shift_end = datetime.now()
        imbalance = close_out.actual_cash_drawer_balance - cashier.cash_drawer_balance

        transfer_product = await fetch_money_transfer_product(conn=conn)
        line_items = [
            NewLineItem(
                quantity=1,
                product_id=transfer_product.id,
                product_price=close_out.actual_cash_drawer_balance,
                tax_name=transfer_product.tax_name,
                tax_rate=transfer_product.tax_rate,
            )
        ]

        bookings: dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=cashier.cashier_account_id, target_account_id=ACCOUNT_CASH_VAULT
            ): close_out.actual_cash_drawer_balance,
            BookingIdentifier(
                source_account_id=cashier.cashier_account_id, target_account_id=ACCOUNT_IMBALANCE
            ): -imbalance,
        }

        order_id = await book_order(
            conn=conn,
            payment_method=PaymentMethod.cash,
            order_type=OrderType.money_transfer,
            till_id=VIRTUAL_TILL_ID,
            cashier_id=current_user.id,
            line_items=line_items,
            bookings=bookings,
            cash_register_id=cashier.cash_register_id,
        )

        await conn.execute(
            "insert into cashier_shift ("
            "   cashier_id, started_at, ended_at, final_cash_drawer_balance, final_cash_drawer_imbalance, "
            "   comment, close_out_order_id, closing_out_user_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8)",
            cashier.id,
            shift_start,
            shift_end,
            cashier.cash_drawer_balance,
            imbalance,
            close_out.comment,
            order_id,
            close_out.closing_out_user_id,
        )

        await conn.execute("update usr set cash_register_id = null where id = $1", cashier.id)

        return CloseOutResult(cashier_id=cashier.id, imbalance=imbalance)
