import datetime
import enum
from typing import Optional
from uuid import UUID

from pydantic import root_validator

from stustapay.core.schema.product import Product
from stustapay.core.util import BaseModel


class OrderType(enum.Enum):
    sale = "sale"
    topup_cash = "topup_cash"
    topup_sumup = "topup_sumup"


class NewLineItem(BaseModel):
    product_id: int

    # for products with a fixed price, the quantity must be specified
    # for products with variable price the used price must be set
    quantity: Optional[int] = None
    price: Optional[float] = None

    # check for new Items if either quantity or price is set
    @root_validator
    def check_quantity_or_price_set(cls, values):  # pylint: disable=no-self-argument
        quantity, price = values.get("quantity"), values.get("price")
        if (quantity is None) == (price is None):
            raise ValueError("either price or quantity must be set")
        return values


class NewOrder(BaseModel):
    positions: list[NewLineItem]
    order_type: OrderType
    customer_tag_uid: int
    uuid: Optional[UUID] = None
    used_vouchers: Optional[int] = None


class PendingLineItem(BaseModel):
    quantity: int
    product: Product
    price: float
    tax_name: str
    tax_rate: float

    @property
    def total_price(self) -> float:
        return self.price * self.quantity


class PendingOrder(BaseModel):
    order_type: OrderType

    old_balance: float
    new_balance: float

    old_voucher_balance: int
    new_voucher_balance: int

    customer_account_id: int

    line_items: list[PendingLineItem]

    @property
    def item_count(self) -> int:
        return len(self.line_items)

    @property
    def total_price(self) -> float:
        agg = 0.0
        for line_item in self.line_items:
            agg += line_item.total_price
        return agg


class CompletedOrder(PendingOrder):
    id: int
    uuid: UUID

    booked_at: datetime.datetime

    cashier_id: int
    till_id: int


class LineItem(PendingLineItem):
    item_id: int
    total_tax: float


class Order(BaseModel):
    """
    represents a completely finished order with all relevant data
    """

    id: int
    uuid: UUID

    total_price: float
    total_tax: float
    total_no_tax: float

    booked_at: datetime.datetime
    payment_method: Optional[str]
    order_type: OrderType

    # foreign keys
    cashier_id: int
    till_id: int
    customer_account_id: int

    line_items: list[LineItem]
