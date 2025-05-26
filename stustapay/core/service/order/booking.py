import logging
import typing
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import CurrentUser
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.product import fetch_money_difference_product, fetch_money_transfer_product
from stustapay.core.service.till.common import fetch_virtual_till, get_cash_register_account_id
from stustapay.core.service.transaction import book_transaction

logger = logging.getLogger(__name__)


@dataclass(eq=True, frozen=True)
class BookingIdentifier:
    source_account_id: int
    target_account_id: int


async def book_prepared_bookings(*, conn: Connection, order_id: int, bookings: dict[BookingIdentifier, float]):
    """
    insert the selected bookings into the database.
    bookings are (source, target, tax) -> amount
    """
    for booking_identifier, amount in bookings.items():
        await book_transaction(
            conn=conn,
            order_id=order_id,
            source_account_id=booking_identifier.source_account_id,
            target_account_id=booking_identifier.target_account_id,
            amount=amount,
        )


class NewLineItem(BaseModel):
    quantity: int
    product_id: int
    product_price: float
    tax_rate_id: int


@dataclass
class OrderInfo:
    id: int
    uuid: UUID
    booked_at: datetime


async def book_money_transfer(
    *,
    conn: Connection,
    node: Node,
    originating_user_id: int,
    cash_register_id: int,
    bookings: dict[BookingIdentifier, float],
    amount: float,
    till_id: int | None,
) -> OrderInfo:
    transfer_product = await fetch_money_transfer_product(conn=conn, node=node)
    line_items = [
        NewLineItem(
            quantity=1,
            product_id=transfer_product.id,
            product_price=amount,
            tax_rate_id=transfer_product.tax_rate_id,
        )
    ]

    return await book_order(
        conn=conn,
        payment_method=PaymentMethod.cash,
        order_type=OrderType.money_transfer,
        till_id=till_id,
        cashier_id=originating_user_id,
        line_items=line_items,
        bookings=bookings,
        cash_register_id=cash_register_id,
    )


async def book_order(
    *,
    conn: Connection,
    order_type: OrderType,
    payment_method: PaymentMethod,
    cashier_id: Optional[int],
    till_id: Optional[int],
    line_items: list[NewLineItem],
    bookings: dict[BookingIdentifier, float],
    uuid: Optional[UUID] = None,
    cancels_order: Optional[int] = None,
    customer_account_id: Optional[int] = None,
    cash_register_id: Optional[int] = None,
    booked_at: Optional[datetime] = None,
) -> OrderInfo:
    z_nr = await conn.fetchval("select z_nr from till where id = $1", till_id)
    if z_nr is None:
        raise InvalidArgument("Till does not exist")

    uuid = uuid or uuid4()
    booked_at = booked_at or datetime.now(tz=timezone.utc)
    order_already_booked = await conn.fetchval("select id, booked_at from ordr where uuid = $1", uuid)
    if order_already_booked is not None:
        order_id = order_already_booked["id"]
        booked_at = typing.cast(datetime, order_already_booked["booked_at"])
        logger.info(f"Tried to book existing order with {uuid = }, returning existing order ...")
    else:
        order_row = await conn.fetchrow(
            "insert into ordr (uuid, item_count, payment_method, order_type, cancels_order, cashier_id, "
            "   till_id, customer_account_id, cash_register_id, z_nr, booked_at) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id, uuid, booked_at",
            uuid,
            len(line_items),
            payment_method.name,
            order_type.name,
            cancels_order,
            cashier_id,
            till_id,
            customer_account_id,
            cash_register_id if payment_method == PaymentMethod.cash else None,
            z_nr,
            booked_at,
        )
        order_id = order_row["id"]

        for i, line_item in enumerate(line_items):
            await conn.fetchval(
                "insert into line_item (order_id, item_id, product_id, product_price, quantity, tax_rate_id, "
                "   tax_name, tax_rate) "
                "select $1, $2, $3, $4, $5, $6, t.name, t.rate "
                "from tax_rate t where t.id = $6",
                order_id,
                i,
                line_item.product_id,
                line_item.product_price,
                line_item.quantity,
                line_item.tax_rate_id,
            )
        await book_prepared_bookings(conn=conn, order_id=order_id, bookings=bookings)
    return OrderInfo(id=order_id, uuid=uuid, booked_at=booked_at)


async def book_imbalance_order(
    *,
    conn: Connection,
    current_user: CurrentUser,
    node: Node,
    cash_register_id: int,
    imbalance: float,
) -> OrderInfo:
    cash_register_account_id = await get_cash_register_account_id(
        conn=conn, node=node, cash_register_id=cash_register_id
    )
    difference_product = await fetch_money_difference_product(conn=conn, node=node)
    line_items = [
        NewLineItem(
            quantity=1,
            product_id=difference_product.id,
            product_price=imbalance,
            tax_rate_id=difference_product.tax_rate_id,
        )
    ]

    cash_imbalance_acc = await get_system_account_for_node(
        conn=conn, node=node, account_type=AccountType.cash_imbalance
    )

    bookings: dict[BookingIdentifier, float] = {
        BookingIdentifier(
            source_account_id=cash_register_account_id, target_account_id=cash_imbalance_acc.id
        ): -imbalance,
    }
    virtual_till = await fetch_virtual_till(conn=conn, node=node)

    return await book_order(
        conn=conn,
        payment_method=PaymentMethod.cash,
        order_type=OrderType.money_transfer_imbalance,
        till_id=virtual_till.id,
        cashier_id=current_user.id,
        line_items=line_items,
        bookings=bookings,
        cash_register_id=cash_register_id,
    )


async def book_cashier_shift_start_order(
    *,
    conn: Connection,
    cashier_id: int,
    node: Node,
    cash_register_id: int,
) -> OrderInfo:
    virtual_till = await fetch_virtual_till(conn=conn, node=node)

    return await book_order(
        conn=conn,
        payment_method=PaymentMethod.cash,
        order_type=OrderType.cashier_shift_start,
        till_id=virtual_till.id,
        cashier_id=cashier_id,
        line_items=[],
        bookings={},
        cash_register_id=cash_register_id,
    )


async def book_cashier_shift_end_order(
    *,
    conn: Connection,
    cashier_id: int,
    node: Node,
    cash_register_id: int,
) -> OrderInfo:
    virtual_till = await fetch_virtual_till(conn=conn, node=node)

    return await book_order(
        conn=conn,
        payment_method=PaymentMethod.cash,
        order_type=OrderType.cashier_shift_end,
        till_id=virtual_till.id,
        cashier_id=cashier_id,
        line_items=[],
        bookings={},
        cash_register_id=cash_register_id,
    )


async def book_money_transfer_close_out_start(
    *, conn: Connection, current_user: CurrentUser, node: Node, cash_register_id: int, amount: float
) -> OrderInfo:
    virtual_till = await fetch_virtual_till(conn=conn, node=node)
    return await book_money_transfer(
        conn=conn,
        node=node,
        originating_user_id=current_user.id,
        cash_register_id=cash_register_id,
        amount=amount,
        till_id=virtual_till.id,
        bookings={},
    )


async def book_money_transfer_cash_vault_order(
    *,
    conn: Connection,
    current_user: CurrentUser,
    node: Node,
    cash_register_id: int,
    amount: float,
) -> OrderInfo:
    cash_register_account_id = await get_cash_register_account_id(
        conn=conn, node=node, cash_register_id=cash_register_id
    )
    cash_vault_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_vault)
    bookings: dict[BookingIdentifier, float] = {
        BookingIdentifier(source_account_id=cash_register_account_id, target_account_id=cash_vault_acc.id): amount,
    }
    virtual_till = await fetch_virtual_till(conn=conn, node=node)
    return await book_money_transfer(
        conn=conn,
        node=node,
        originating_user_id=current_user.id,
        cash_register_id=cash_register_id,
        amount=-amount,
        bookings=bookings,
        till_id=virtual_till.id,
    )
