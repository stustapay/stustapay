import datetime
import enum
import uuid
from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order


class Customer(Account):
    iban: Optional[str]
    account_name: Optional[str]
    email: Optional[str]
    donation: Optional[float]
    payout_error: Optional[str]
    payout_run_id: Optional[int]
    payout_export: Optional[bool]


class OrderWithBon(Order):
    bon_generated: Optional[bool]
    bon_output_file: Optional[str]


class SumupCheckoutStatus(enum.Enum):
    PENDING = "PENDING"
    FAILED = "FAILED"
    PAID = "PAID"


class CustomerCheckout(BaseModel):
    checkout_reference: uuid.UUID
    amount: float
    currency: str
    merchant_code: str
    description: str
    id: str
    status: SumupCheckoutStatus
    date: datetime.datetime
    valid_until: Optional[datetime.datetime]
    last_checked: Optional[datetime.datetime]
    check_interval: int
    customer_account_id: int
