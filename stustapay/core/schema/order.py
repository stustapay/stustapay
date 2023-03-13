import datetime
import enum
from typing import Optional
from uuid import UUID

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


class OrderBooking(BaseModel):
    value_sum: float
    value_tax: float
    value_notax: float


class CompletedOrder(BaseModel):
    id: int
    uuid: UUID
    old_balance: float
    new_balance: float


class Order(OrderBooking):
    """
    represents a completely finished order with all relevant data
    """

    id: int
    uuid: UUID
    itemcount: int
    status: str
    created_at: datetime.datetime
    finished_at: Optional[datetime.datetime]
    payment_method: Optional[str]
    order_type: OrderType

    # foreign keys
    cashier_id: int
    till_id: int
    customer_account_id: int

    line_items: list[LineItem]
