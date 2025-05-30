from datetime import datetime
from typing import Optional

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.cashier import Cashier, CashierShift, CashierShiftStats
from stustapay.core.schema.order import Order
from stustapay.core.schema.product import Product
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege, User
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.order.booking import (
    book_cashier_shift_end_order,
    book_imbalance_order,
    book_money_transfer_cash_vault_order,
    book_money_transfer_close_out_start,
)
from stustapay.core.service.till.common import get_cash_register_account_id

from .common.error import NotFound, ServiceException
from .till.common import fetch_virtual_till
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


class CashierService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_cashiers(self, *, conn: Connection, node: Node) -> list[Cashier]:
        return await conn.fetch_many(
            Cashier, "select * from cashier where node_id = any($1) order by login", node.ids_to_event_node
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_cashier(self, *, conn: Connection, node: Node, cashier_id: int) -> Optional[Cashier]:
        return await conn.fetch_maybe_one(
            Cashier, "select * from cashier where id = $1 and node_id = any($2)", cashier_id, node.ids_to_event_node
        )

    @staticmethod
    async def _get_cashier_shift(conn: Connection, cashier_id: int, shift_id: int) -> Optional[CashierShift]:
        return await conn.fetch_maybe_one(
            CashierShift, "select * from cashier_shift where cashier_id = $1 and id = $2", cashier_id, shift_id
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_cashier_shifts(
        self, *, conn: Connection, current_user: User, node: Node, cashier_id: int
    ) -> list[CashierShift]:
        # TODO: tree scope
        cashier = await self.get_cashier(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, node=node, cashier_id=cashier_id
        )
        if not cashier:
            raise NotFound(element_type="cashier", element_id=cashier_id)
        return await conn.fetch_many(CashierShift, "select * from cashier_shift where cashier_id = $1", cashier_id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_cashier_shifts_for_cash_register(
        self, *, conn: Connection, cash_register_id: int
    ) -> list[CashierShift]:
        return await conn.fetch_many(
            CashierShift, "select * from cashier_shift where cash_register_id = $1", cash_register_id
        )

    @staticmethod
    async def _get_current_cashier_shift_start(*, conn: Connection, cashier_id: int) -> Optional[datetime]:
        return await conn.fetchval(
            "select ordr.booked_at from ordr "
            "where ordr.cashier_id = $1 and ordr.booked_at > coalesce(("
            "   select cs.ended_at from cashier_shift cs "
            "   where cs.cashier_id = $1 order by ended_at desc limit 1"
            "), '1970-01-01'::timestamptz) "
            "order by ordr.booked_at asc limit 1",
            cashier_id,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_cashier_shift_stats(
        self,
        *,
        conn: Connection,
        node: Node,
        cashier_id: int,
        shift_id: Optional[int] = None,
    ) -> CashierShiftStats:
        cashier_exists = await conn.fetchval(
            "select exists(select from cashier where id = $1 and node_id = any($2))", cashier_id, node.ids_to_event_node
        )
        if not cashier_exists:
            raise NotFound(element_type="cashier", element_id=cashier_id)
        shift_end = None
        if shift_id is None:
            shift_start = await self._get_current_cashier_shift_start(conn=conn, cashier_id=cashier_id)
        else:
            shift = await self._get_cashier_shift(conn=conn, cashier_id=cashier_id, shift_id=shift_id)
            if shift is None:
                raise NotFound(element_type="cashier_shift", element_id=shift_id)
            shift_start = shift.started_at
            shift_end = shift.ended_at

        rows = await conn.fetch(
            "select li.product_id, sum(li.quantity) as quantity "
            "from line_item li join ordr o on li.order_id = o.id "
            "where o.cashier_id = $1 and o.booked_at >= $2 and ($3::timestamptz is null or o.booked_at <= $3::timestamptz) "
            "group by li.product_id "
            "order by quantity desc",
            cashier_id,
            shift_start,
            shift_end,
        )

        booked_products = []
        for row in rows:
            product = await conn.fetch_maybe_one(
                Product, "select * from product_with_tax_and_restrictions p where id = $1", row["product_id"]
            )
            if product is None:
                continue
            booked_products.append(CashierShiftStats.CashierProductStats(product=product, quantity=row["quantity"]))

        orders = await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered("
            "   (select array_agg(o.id) from ordr o "
            "   where o.cashier_id = $1 and booked_at >= $2 and ($3::timestamptz is null or booked_at <= $3::timestamptz)), "
            "   $4"
            ")",
            cashier_id,
            shift_start,
            shift_end,
            node.event_node_id,
        )
        return CashierShiftStats(booked_products=booked_products, orders=orders)

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.user])
    @requires_user([Privilege.node_administration])
    async def close_out_cashier(
        self, *, conn: Connection, current_user: CurrentUser, node: Node, cashier_id: int, close_out: CloseOut
    ) -> CloseOutResult:
        cashier = await self.get_cashier(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, node=node, cashier_id=cashier_id
        )
        assert cashier is not None
        if cashier.cash_register_id is None:
            raise InvalidCloseOutException("Cashier does not have a cash register")
        expected_balance = cashier.cash_drawer_balance

        is_logged_in = await conn.fetchval("select exists(select from terminal where active_user_id = $1)", cashier_id)
        if is_logged_in:
            raise InvalidCloseOutException("cannot close out a cashier who is logged in at a terminal")

        if cashier.cash_register_id is None:
            raise InvalidCloseOutException("cashier does not have a cash register assigned")

        # TODO: which way to compute this
        shift_start = await self._get_current_cashier_shift_start(conn=conn, cashier_id=cashier_id)
        if shift_start is None:
            raise InvalidCloseOutException("the cashier did not start a shift, no orders were booked")
        shift_end = datetime.now()
        imbalance = close_out.actual_cash_drawer_balance - expected_balance

        # first we transfer all money to the virtual till via a tse signed order
        await book_money_transfer_close_out_start(
            conn=conn,
            current_user=current_user,
            node=node,
            cash_register_id=cashier.cash_register_id,
            amount=expected_balance,
        )

        # then we book two orders, one to track the imbalance, on to transfer the money to the cash vault
        order_info = await book_money_transfer_cash_vault_order(
            conn=conn,
            current_user=current_user,
            node=node,
            cash_register_id=cashier.cash_register_id,
            amount=close_out.actual_cash_drawer_balance,
        )
        imbalance_order_info = await book_imbalance_order(
            conn=conn,
            current_user=current_user,
            node=node,
            cash_register_id=cashier.cash_register_id,
            imbalance=imbalance,
        )
        await book_cashier_shift_end_order(
            conn=conn,
            cashier_id=cashier.id,
            node=node,
            cash_register_id=cashier.cash_register_id,
        )

        await conn.execute(
            "insert into cashier_shift ("
            "   cashier_id, started_at, ended_at, actual_cash_drawer_balance, expected_cash_drawer_balance, "
            "   comment, close_out_order_id, close_out_imbalance_order_id, closing_out_user_id, cash_register_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            cashier.id,
            shift_start,
            shift_end,
            close_out.actual_cash_drawer_balance,
            expected_balance,
            close_out.comment,
            order_info.id,
            imbalance_order_info.id,
            close_out.closing_out_user_id,
            cashier.cash_register_id,
        )

        virtual_till = await fetch_virtual_till(conn=conn, node=node)
        await conn.execute("update usr set cash_register_id = null where id = $1", cashier.id)
        await conn.execute("update till set z_nr = z_nr + 1 where id = $1", virtual_till.id)
        # correct the actual balance to rule out any floating point errors / representation errors
        cash_register_account_id = await get_cash_register_account_id(
            conn=conn, node=None, cash_register_id=cashier.cash_register_id
        )
        await conn.execute("update account set balance = 0 where id = $1", cash_register_account_id)
        close_out_result = CloseOutResult(cashier_id=cashier.id, imbalance=imbalance)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.cashier_closed_out,
            content={"close_out": close_out.model_dump(), "result": close_out_result.model_dump()},
            user_id=current_user.id,
            node_id=node.id,
        )

        return close_out_result
