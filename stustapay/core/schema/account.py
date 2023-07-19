import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field

from stustapay.core.schema.order import OrderType
from stustapay.core.schema.product import Product, ProductRestriction
from stustapay.core.schema.user import format_user_tag_uid

# Global Account IDs for virtual accounts
# The virtual accounts are all fixed in the database
ACCOUNT_SALE_EXIT = 0
ACCOUNT_CASH_ENTRY = 1
ACCOUNT_DEPOSIT = 2
ACCOUNT_SUMUP = 3
ACCOUNT_CASH_VAULT = 4
ACCOUNT_IMBALANCE = 5
ACCOUNT_MONEY_VOUCHER_CREATE = 6
ACCOUNT_CASH_EXIT = 7
ACCOUNT_CASH_SALE_SOURCE = 8
ACCOUNT_SUMUP_CUSTOMER_TOPUP = 9


class AccountType(enum.Enum):
    virtual = "virtual"
    internal = "internal"
    private = "private"


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
        if product.target_account_id is not None:
            return product.target_account_id
        return ACCOUNT_SALE_EXIT
    raise NotImplementedError()


class UserTagAccountAssociation(BaseModel):
    account_id: int
    mapping_was_valid_until: datetime


class UserTagDetail(BaseModel):
    user_tag_uid: int

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return hex(self.user_tag_uid) if self.user_tag_uid is not None else None

    comment: Optional[str] = None
    account_id: Optional[int] = None

    account_history: list[UserTagAccountAssociation]


class UserTagHistoryEntry(BaseModel):
    user_tag_uid: int

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return hex(self.user_tag_uid)

    account_id: int
    comment: Optional[str] = None
    mapping_was_valid_until: datetime


class Account(BaseModel):
    id: int
    type: AccountType
    name: Optional[str]
    comment: Optional[str]
    balance: float
    vouchers: int

    # metadata relevant to a tag
    user_tag_uid: Optional[int]

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)

    user_tag_comment: Optional[str] = None
    restriction: Optional[ProductRestriction]

    tag_history: list[UserTagHistoryEntry]
