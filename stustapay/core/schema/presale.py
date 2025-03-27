
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.account import Account
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.order import Order
from stustapay.core.schema.payout import Payout
from stustapay.payment.sumup.api import SumUpCheckoutStatus


class Presale(Account):
    email: str
    name: str
    customer: Customer | None


class PresaleCheckout(BaseModel):
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