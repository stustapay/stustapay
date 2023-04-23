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


class TopUpType(enum.Enum):
    sumup = "sumup"
    cash = "cash"

    def as_order_type(self):
        if self == TopUpType.cash:
            return "topup_cash"
        elif self == TopUpType.sumup:
            return "topup_sumup"
        else:
            raise RuntimeError("Unknown top up type, probably missed during implementation")


class NewTopUp(BaseModel):
    uuid: Optional[UUID] = None
    topup_type: TopUpType

    amount: float
    customer_tag_uid: int


class PendingTopUp(NewTopUp):
    customer_account_id: int

    old_balance: float
    new_balance: float


class CompletedTopUp(BaseModel):
    topup_type: TopUpType

    customer_tag_uid: int
    customer_account_id: int

    amount: float
    old_balance: float
    new_balance: float

    uuid: UUID
    booked_at: datetime.datetime

    cashier_id: int
    till_id: int


class Button(BaseModel):
    till_button_id: int

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


class NewSale(BaseModel):
    buttons: list[Button]
    customer_tag_uid: int
    used_vouchers: Optional[int] = None


class PendingLineItem(BaseModel):
    quantity: int
    product: Product
    # the following members are also in Product, but maybe they were updated in the meantime
    product_price: float
    tax_name: str
    tax_rate: float

    @property
    def total_price(self) -> float:
        return self.product_price * self.quantity


class PendingSale(BaseModel):
    buttons: list[Button]

    old_balance: float
    new_balance: float

    old_voucher_balance: int
    new_voucher_balance: int

    customer_account_id: int

    line_items: list[PendingLineItem]

    @property
    def used_vouchers(self) -> int:
        return self.old_voucher_balance - self.new_voucher_balance

    @property
    def item_count(self) -> int:
        return len(self.line_items)

    @property
    def total_price(self) -> float:
        agg = 0.0
        for line_item in self.line_items:
            agg += line_item.total_price
        return agg


class CompletedSale(PendingSale):
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
