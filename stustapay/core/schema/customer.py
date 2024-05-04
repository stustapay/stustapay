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

    payout: Payout | None


class OrderWithBon(Order):
    bon_generated: Optional[bool]


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
