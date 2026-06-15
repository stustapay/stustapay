import datetime
import uuid
from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order
from stustapay.core.schema.payout import Payout
from stustapay.payment.sumup.api import SumUpCheckoutStatus


class Customer(Account):
    iban: Optional[str]
    account_name: Optional[str]
    email: Optional[str]
    donation: Optional[float]
    payout_export: Optional[bool]
    user_tag_pin: Optional[str]
    donate_all: bool
    has_entered_info: bool

    payout: Payout | None


class PayoutInfo(BaseModel):
    in_payout_run: bool
    payout_date: datetime.datetime | None


class OrderWithBon(Order):
    bon_generated: Optional[bool]


class PayoutTransaction(BaseModel):
    amount: float
    booked_at: datetime.datetime
    target_account_name: str
    target_account_type: str
    transaction_id: int


class CustomerCheckout(BaseModel):
    checkout_reference: uuid.UUID
    amount: float
    currency: str
    merchant_code: str
    description: str
    id: str
    status: SumUpCheckoutStatus
    date: datetime.datetime
    valid_until: Optional[datetime.datetime]
    last_checked: Optional[datetime.datetime]
    check_interval: int
    customer_account_id: int


class SharedTopupLink(BaseModel):
    id: int
    token: str | None = None
    created_at: datetime.datetime
    expires_at: datetime.datetime | None
    revoked_at: datetime.datetime | None
    label: str | None


class SharedTopupPublicInfo(BaseModel):
    event_name: str
    currency_identifier: str
    payment_methods: list[str]


class SharedTopupContribution(BaseModel):
    order_uuid: uuid.UUID
    contributor_name: str
    amount: float
    status: str
    created_at: datetime.datetime
    booked_at: datetime.datetime | None
