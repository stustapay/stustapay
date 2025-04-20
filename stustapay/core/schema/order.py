import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, computed_field, field_validator, model_validator

from stustapay.core.schema.product import Product
from stustapay.core.schema.ticket import TicketScanResultEntry
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.schema.user_tag import UserTagScan


class OrderType(enum.Enum):
    sale = "sale"
    cancel_sale = "cancel_sale"
    top_up = "top_up"
    pay_out = "pay_out"
    ticket = "ticket"
    money_transfer = "money_transfer"
    money_transfer_imbalance = "money_transfer_imbalance"
    cashier_shift_start = "cashier_shift_start"
    cashier_shift_end = "cashier_shift_end"


class PaymentMethod(enum.Enum):
    cash = "cash"
    sumup = "sumup"
    tag = "tag"
    sumup_online = "sumup_online"


def is_non_tag_payment_method(payment_method: PaymentMethod):
    if payment_method == PaymentMethod.tag:
        raise ValueError("payment method cannot be 'tag'")
    return payment_method


def get_source_account(order_type: OrderType, customer_account: int):
    """
    return the transaction source account, depending on the order type or sold product
    """
    if order_type == OrderType.sale:
        return customer_account
    raise NotImplementedError()


def get_target_account(order_type: OrderType, product: Product, sale_exit_account_id: int):
    """
    return the transaction target account, depending on the order type or sold product
    """
    if order_type == OrderType.sale:
        if product.target_account_id is not None:
            return product.target_account_id
        return sale_exit_account_id
    raise NotImplementedError()


class NewTopUp(BaseModel):
    uuid: UUID
    payment_method: PaymentMethod

    amount: float
    customer_tag_uid: int

    _validate_payment_method = field_validator("payment_method")(is_non_tag_payment_method)


class PendingTopUp(NewTopUp):
    customer_account_id: int

    old_balance: float
    new_balance: float


class CompletedTopUp(BaseModel):
    payment_method: PaymentMethod

    # can be none in online topups with presale
    customer_tag_uid: int | None
    customer_account_id: int

    amount: float
    old_balance: float
    new_balance: float

    uuid: UUID
    booked_at: datetime

    cashier_id: int | None  # can be none in online topup scenario
    till_id: int


class NewPayOut(BaseModel):
    # if no amount is passed, the current customer account balance is assumed as payout
    uuid: UUID
    customer_tag_uid: int
    amount: Optional[float] = None


class PendingPayOut(NewPayOut):
    amount: float

    customer_account_id: int

    old_balance: float
    new_balance: float


class CompletedPayOut(PendingPayOut):
    booked_at: datetime

    cashier_id: int
    till_id: int


class Button(BaseModel):
    till_button_id: int

    # for products with a fixed price, the quantity must be specified
    # for products with variable price the used price must be set
    quantity: Optional[int] = None
    price: Optional[float] = None

    # check for new Items if either quantity or price is set
    @model_validator(mode="after")  # type: ignore
    @classmethod
    def check_quantity_or_price_set(cls, m: "Button"):
        if (m.quantity is None) == (m.price is None):
            raise ValueError("either price or quantity must be set")
        return m


class BookedProduct(BaseModel):
    product_id: int

    # for products with a fixed price, the quantity must be specified
    # for products with variable price the used price must be set
    quantity: Optional[int] = None
    price: Optional[float] = None

    # check for new Items if either quantity or price is set
    @model_validator(mode="after")  # type: ignore
    @classmethod
    def check_quantity_or_price_set(cls, m: "BookedProduct"):
        if (m.quantity is None) == (m.price is None):
            raise ValueError("either price or quantity must be set")
        return m


class NewSaleBase(BaseModel):
    uuid: UUID

    customer_tag_uid: Optional[int] = None
    payment_method: PaymentMethod

    used_vouchers: Optional[int] = None


class NewSale(NewSaleBase):
    buttons: list[Button]


class NewSaleProducts(NewSaleBase):
    products: list[BookedProduct]


class EditSaleProducts(BaseModel):
    uuid: UUID
    used_vouchers: Optional[int] = None
    products: list[BookedProduct]


class PendingLineItem(BaseModel):
    quantity: int
    product: Product
    # the following members are also in Product, but maybe they were updated in the meantime
    product_price: float
    tax_rate_id: int
    tax_name: str
    tax_rate: float

    @computed_field  # type: ignore[misc]
    @property
    def total_price(self) -> float:
        # pylint false positive
        return self.product_price * self.quantity  # pylint: disable=no-member


class PendingSaleBase(BaseModel):
    uuid: UUID

    old_balance: float
    new_balance: float

    old_voucher_balance: int
    new_voucher_balance: int

    customer_account_id: Optional[int]
    payment_method: PaymentMethod

    line_items: list[PendingLineItem]

    @computed_field  # type: ignore[misc]
    @property
    def used_vouchers(self) -> int:
        return self.old_voucher_balance - self.new_voucher_balance

    @computed_field  # type: ignore[misc]
    @property
    def item_count(self) -> int:
        return len(self.line_items)

    @computed_field  # type: ignore[misc]
    @property
    def total_price(self) -> float:
        agg = 0.0
        for line_item in self.line_items:
            agg += line_item.total_price
        return agg


class PendingSaleProducts(PendingSaleBase):
    products: list[BookedProduct]


class PendingSale(PendingSaleBase):
    buttons: list[Button]


class CompletedSaleBase(BaseModel):
    id: int

    booked_at: datetime

    cashier_id: int
    till_id: int

    customer_account_id: Optional[int]
    payment_method: PaymentMethod


class CompletedSaleProducts(CompletedSaleBase, PendingSaleProducts):
    pass


class CompletedSale(CompletedSaleBase, PendingSale):
    bon_url: str


class NewTicketSale(BaseModel):
    uuid: UUID
    customer_tags: list[UserTagScan]

    payment_method: Optional[PaymentMethod]

    _validate_payment_method = field_validator("payment_method")(is_non_tag_payment_method)


class PendingTicketSale(BaseModel):
    uuid: UUID

    payment_method: Optional[PaymentMethod]

    line_items: list[PendingLineItem]

    scanned_tickets: list[TicketScanResultEntry]

    @computed_field  # type: ignore[misc]
    @property
    def item_count(self) -> int:
        return len(self.line_items)

    @computed_field  # type: ignore[misc]
    @property
    def total_price(self) -> float:
        agg = 0.0
        for line_item in self.line_items:
            agg += line_item.total_price
        return agg


class CompletedTicketSale(PendingTicketSale):
    booked_at: datetime

    payment_method: PaymentMethod

    customer_account_id: int | None  # can be None in pending payments

    cashier_id: int
    till_id: int


class CustomerRegistration(BaseModel):
    account_id: int
    restriction: str | None
    ticket_included_top_up: float
    # additional top-up requested on-site
    top_up_amount: float


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
    cancels_order: Optional[int]

    booked_at: datetime
    payment_method: PaymentMethod
    order_type: OrderType

    # foreign keys
    cashier_id: Optional[int]
    till_id: Optional[int]
    cash_register_id: Optional[int]
    customer_account_id: Optional[int]
    customer_tag_uid: Optional[int]
    customer_tag_id: Optional[int]

    @computed_field  # type: ignore[misc]
    @property
    def customer_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.customer_tag_uid)

    line_items: list[LineItem]


class Transaction(BaseModel):
    id: int
    conducting_user_id: int | None
    description: str | None
    source_account: int
    target_account: int
    order: Order | None
    booked_at: datetime
    amount: float
    vouchers: int


class NewFreeTicketGrant(BaseModel):
    user_tag_pin: str
    user_tag_uid: int
    initial_voucher_amount: int = 0

    @field_validator("initial_voucher_amount")
    def initial_voucher_amount_is_positive(cls, v):  # pylint: disable=no-self-argument
        if v < 0:
            raise ValueError("initial voucher amount must be positive")
        return v


class PendingOrderType(enum.Enum):
    topup = "topup"
    ticket = "ticket"


class PendingOrderStatus(enum.Enum):
    pending = "pending"
    booked = "booked"
    cancelled = "cancelled"


class PendingOrder(BaseModel):
    uuid: UUID
    node_id: int
    till_id: int
    cashier_id: int | None
    last_checked: datetime | None
    check_interval: int
    created_at: datetime
    order_type: PendingOrderType
    order_content_version: int
    order_content: str
    status: PendingOrderStatus
