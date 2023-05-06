from dataclasses import dataclass
from typing import Optional
from uuid import UUID, uuid4

import asyncpg

from stustapay.core.schema.order import PaymentMethod, OrderType
from stustapay.core.service.transaction import book_transaction
from stustapay.core.util import BaseModel


@dataclass(eq=True, frozen=True)
class BookingIdentifier:
    source_account_id: int
    target_account_id: int


async def book_prepared_bookings(*, conn: asyncpg.Connection, order_id: int, bookings: dict[BookingIdentifier, float]):
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
    tax_name: str
    tax_rate: float


async def book_order(
    conn: asyncpg.Connection,
    order_type: OrderType,
    payment_method: PaymentMethod,
    cashier_id: int,
    till_id: int,
    line_items: list[NewLineItem],
    bookings: dict[BookingIdentifier, float],
    uuid: Optional[UUID] = None,
    cancels_order: Optional[int] = None,
    customer_account_id: Optional[int] = None,
    cash_register_id: Optional[int] = None,
) -> int:
    uuid = uuid or uuid4()
    order_id = await conn.fetchval(
        "insert into ordr (uuid, item_count, payment_method, order_type, cancels_order, cashier_id, "
        "   till_id, customer_account_id, cash_register_id) "
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id",
        uuid,
        len(line_items),
        payment_method.name,
        order_type.name,
        cancels_order,
        cashier_id,
        till_id,
        customer_account_id,
        cash_register_id,
    )

    for i, line_item in enumerate(line_items):
        await conn.fetchval(
            "insert into line_item (order_id, item_id, product_id, product_price, quantity, tax_name, tax_rate) "
            "values ($1, $2, $3, $4, $5, $6, $7)",
            order_id,
            i,
            line_item.product_id,
            line_item.product_price,
            line_item.quantity,
            line_item.tax_name,
            line_item.tax_rate,
        )
    await book_prepared_bookings(conn=conn, order_id=order_id, bookings=bookings)
    return order_id
