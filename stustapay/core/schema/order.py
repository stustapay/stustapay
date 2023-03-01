import datetime
import enum

from pydantic import BaseModel

from stustapay.core.schema.product import Product


class OrderType(enum.Enum):
    sale = "sale"
    topup_cash = "topup_cash"
    topup_sum = "topup_sumup"


class NewLineItem(BaseModel):
    product_id: int
    quantity: int


class NewOrder(BaseModel):
    positions: list[NewLineItem]
    order_type: OrderType
    customer_tag: int


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
            product=Product.parse_obj(row),
            quantity=row["quantity"],
            price=row["price"],
            total_price=row["total_price"],
            tax_name=row["tax_name"],
            tax_rate=row["tax_rate"],
            total_tax=row["total_tax"],
        )


class OrderBooking(BaseModel):
    value_sum: float
    value_tax: float
    value_notax: float


class CompletedOrder(BaseModel):
    id: int
    uuid: str
    old_balance: float
    new_balance: float


class Order(OrderBooking):
    """
    represents a completely finished order with all relevant data
    """

    id: int
    uuid: str
    itemcount: int
    status: str
    created_at: datetime.datetime
    finished_at: datetime.datetime
    payment_method: str
    order_type: OrderType

    # foreign keys
    cashier_id: int
    terminal_id: int
    customer_account_id: int

    line_items: list[LineItem]

    @classmethod
    def from_db(cls, row, line_items) -> "Order":
        order = cls.parse_obj(row)
        order.line_items = line_items
        return order
        # return cls(
        #     id=row["id"],
        #     uuid=row["uuid"],
        #     itemcount=row["itemcount"],
        #     status=row["status"],
        #     created_at=row["created_at"],
        #     finished_at=row["finished_at"],
        #     payment_method=row["payment_method"],
        #     order_type=row["order_type"],
        #     value_sum=row["value_sum"],
        #     value_tax=row["value_tax"],
        #     value_notax=row["value_notax"],
        #     cashier_id=row["cashier_id"],
        #     terminal_id=row["terminal_id"],
        #     customer_account_id=row["customer_account_id"],
        #     line_items=line_items,
        # )
