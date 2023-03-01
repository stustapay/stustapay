from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.order import OrderType
from stustapay.core.schema.product import Product

# Global Account IDs for virtual accounts
# The virtual accounts are all fixed in the database
ACCOUNT_SALE_EXIT = 0
ACCOUNT_SALE_ENTRY = 1
ACCOUNT_DEPOSIT = 2
ACCOUNT_SUMUP = 3
ACCOUNT_CASH_VAULT = 4


def get_source_account(order_type: OrderType, product: Product, customer_account: int):
    """
    return the transaction source account, depending on the order type or sold product
    """
    del product
    if order_type == OrderType.sale:
        return customer_account
    raise NotImplementedError()


def get_target_account(order_type: OrderType, product: Product, customer_account: int):
    """
    return the transaction target account, depending on the order type or sold product
    """
    del customer_account
    if order_type == OrderType.sale:
        if product.target_account is not None:
            return product.target_account
        return ACCOUNT_SALE_EXIT
    raise NotImplementedError()


class Account(BaseModel):
    id: int
    user_tag_id: int
    type: str
    name: Optional[str]
    comment: Optional[str]
    balance: float
