import datetime
from typing import Optional
from stustapay.core.schema.account import Account
from stustapay.core.schema.config import PublicConfig
from stustapay.core.schema.order import Order
from stustapay.core.util import BaseModel


class Customer(Account):
    iban: Optional[str]
    account_name: Optional[str]
    email: Optional[str]


class OrderWithBon(Order):
    bon_generated: Optional[bool]
    bon_output_file: Optional[str]


class BaseCustomerCheckout(BaseModel):
    checkout_reference: str
    amount: float
    currency: str
    merchant_code: str
    pay_to_email: str
    description: str
    return_url: str
    id: str
    status: str
    date: datetime.datetime
    valid_until: datetime.datetime


class CustomerCheckout(BaseCustomerCheckout):
    customer_id: int