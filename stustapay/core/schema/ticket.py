from datetime import datetime

from pydantic import BaseModel

from stustapay.core.schema.account import Account
from stustapay.core.schema.product import ProductRestriction
from stustapay.core.schema.user_tag import UserTagScan


class NewTicket(BaseModel):
    name: str
    price: float
    tax_rate_id: int
    restrictions: list[ProductRestriction]
    is_locked: bool
    initial_top_up_amount: float


class Ticket(NewTicket):
    node_id: int
    id: int

    tax_name: str
    tax_rate: float

    # what one has to pay (price + initial_top_up_amount)
    total_price: float


class TicketVoucher(BaseModel):
    id: int
    node_id: int
    created_at: datetime
    customer_account_id: int
    token: str


class NewTicketScan(BaseModel):
    customer_tags: list[UserTagScan]


class TicketScanResultEntry(BaseModel):
    customer_tag_uid: int
    customer_tag_pin: str
    ticket: Ticket

    # how much to pay for this ticket
    total_price: float

    # what the user requested at ticket sale
    top_up_amount: float = 0.0

    # which ticket voucher was used
    ticket_voucher: TicketVoucher | None = None
    # associated account due to ticket_voucher
    account: Account | None = None


class TicketScanResult(BaseModel):
    scanned_tickets: list[TicketScanResultEntry]
