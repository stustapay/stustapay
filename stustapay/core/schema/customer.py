from typing import Optional
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order
from stustapay.core.util import BaseModel


class Customer(Account):
    iban: Optional[str]
    account_name: Optional[str]
    email: Optional[str]


class CustomerBank(BaseModel):
    iban: str
    account_name: str
    email: str


class OrderWithBon(Order):
    bon_generated: Optional[bool]
    bon_output_file: Optional[str]
