import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field

from stustapay.core.schema.product import ProductRestriction
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.schema.user_tag_models import UserTagAccountAssociation, UserTagDetail


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
    # cashier = "cashier"  # LEGACY, not used anymore, kept for reference
    voucher_create = "voucher_create"
    donation_exit = "donation_exit"
    sepa_exit = "sepa_exit"
    cash_register = "cash_register"


class UserTagHistoryEntry(BaseModel):
    user_tag_id: int
    user_tag_pin: str
    user_tag_uid: Optional[int]

    account_id: int
    comment: Optional[str] = None
    mapping_was_valid_until: datetime

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)


class Account(BaseModel):
    node_id: int
    id: int
    type: AccountType
    name: Optional[str]
    comment: Optional[str]
    balance: float
    vouchers: int

    # metadata relevant to a tag
    user_tag_id: Optional[int]
    user_tag_uid: Optional[int]
    user_tag_comment: Optional[str] = None
    restriction: Optional[ProductRestriction]
    is_vip: bool = False
    vip_max_balance: Optional[float] = None

    tag_history: list[UserTagHistoryEntry]

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)
