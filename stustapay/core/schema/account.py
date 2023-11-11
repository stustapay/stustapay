import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field

from stustapay.core.schema.order import OrderType
from stustapay.core.schema.product import Product, ProductRestriction
from stustapay.core.schema.user import format_user_tag_uid


class AccountType(enum.Enum):
    private = "private"
    sale_exit = "sale_exit"
    cash_entry = "cash_entry"
    cash_exit = "cash_exit"
    cash_topup_source = "cash_topup_source"
    cash_imbalance = "cash_imbalance"
    cash_vault = "cash_vault"
    sumup_entry = "sumup_entry"
    sumup_online_entry = "sumup_online_entry"
    transport = "transport"
    cashier = "cashier"
    voucher_create = "voucher_create"


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


class UserTagAccountAssociation(BaseModel):
    account_id: int
    mapping_was_valid_until: datetime


class UserTagDetail(BaseModel):
    user_tag_uid: int

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)

    comment: Optional[str] = None
    account_id: Optional[int] = None

    account_history: list[UserTagAccountAssociation]


class UserTagHistoryEntry(BaseModel):
    user_tag_uid: int

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)

    account_id: int
    comment: Optional[str] = None
    mapping_was_valid_until: datetime


class Account(BaseModel):
    node_id: int
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
