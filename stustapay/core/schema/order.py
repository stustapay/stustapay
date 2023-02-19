import datetime
from dataclasses import dataclass

from stustapay.core.schema.product import Product


@dataclass
class NewLineItem:
    product_id: int
    quantity: int


@dataclass
class NewOrder:
    positions: list[NewLineItem]


@dataclass
class LineItem(NewLineItem):
    order_id: int
    item_id: int
    product: Product
    price: float
    total_price: float
    tax_name: str
    tax_rate: float
    total_tax: float

    @classmethod
    def from_db(cls, row) -> "LineItem":
        return cls(
            order_id=row["order_id"],
            item_id=row["item_id"],
            product_id=row["product_id"],
            product=Product.from_db(row),
            quantity=row["quantity"],
            price=row["price"],
            total_price=row["total_price"],
            tax_name=row["tax_name"],
            tax_rate=row["tax_rate"],
            total_tax=row["total_tax"],
        )


@dataclass
class OrderBooking:
    value_sum: float
    value_tax: float
    value_notax: float


@dataclass
class OrderID:
    id: int


@dataclass
class Account:
    name: str
    balance: float


@dataclass
class Order(OrderBooking):
    """
    represents a completely finished order with all relevant data
    """

    id: int
    itemcount: int
    status: str
    created_at: datetime.datetime
    finished_at: datetime.datetime
    payment_method: str
    line_items: list[LineItem]

    # TODO how to handle foreign keys
    # cashier_id: User
    # terminal_id: Terminal
    # customer_account_id: Account

    @classmethod
    def from_db(cls, row, line_items) -> "Order":
        return cls(
            id=row["id"],
            itemcount=row["itemcount"],
            status=row["status"],
            created_at=row["created_at"],
            finished_at=row["finished_at"],
            payment_method=row["payment_method"],
            value_sum=row["value_sum"],
            value_tax=row["value_tax"],
            value_notax=row["value_notax"],
            line_items=line_items,
        )
