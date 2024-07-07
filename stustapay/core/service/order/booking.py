from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.tree import Node
from stustapay.core.service.product import fetch_money_transfer_product
from stustapay.core.service.transaction import book_transaction


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
    till_id: int,
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
) -> OrderInfo:
    z_nr = await conn.fetchval("select z_nr from till where id = $1", till_id)
    if z_nr is None:
        raise InvalidArgument("Till does not exist")

    uuid = uuid or uuid4()
    order_row = await conn.fetchrow(
        "insert into ordr (uuid, item_count, payment_method, order_type, cancels_order, cashier_id, "
        "   till_id, customer_account_id, cash_register_id, z_nr) "
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id, uuid, booked_at",
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
    )
    order_id = order_row["id"]
    booked_at = order_row["booked_at"]

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
