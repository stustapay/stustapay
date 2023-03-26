import datetime
import enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, root_validator

from stustapay.core.schema.product import Product


class OrderType(enum.Enum):
    sale = "sale"
    topup_cash = "topup_cash"
    topup_sumup = "topup_sumup"


class NewLineItem(BaseModel):
    product_id: int

    # for products with a fixed price, the quantity must be specified
    # for products with variable price the used price must be set
    quantity: Optional[int]
    price: Optional[float]

    # check for new Items if either quantity or price is set
    @root_validator
    def check_quantity_or_price_set(cls, values):  # pylint: disable=no-self-argument
        if cls == LineItem:
            # only check for new line item
            return values
        quantity, price = values.get("quantity"), values.get("price")
        if (quantity is None) == (price is None):
            raise ValueError("either price or quantity must be set")
        return values


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


class PendingOrder(CompletedOrder):
    pass


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
