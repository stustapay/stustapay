from datetime import datetime
from typing import Optional

from stustapay.core.schema.product import Product
from stustapay.core.schema.user import format_user_tag_uid
from pydantic import BaseModel, computed_field


class Cashier(BaseModel):
    id: int
    login: str
    display_name: str
    description: Optional[str] = None
    user_tag_uid: Optional[int] = None

    @computed_field
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)

    transport_account_id: Optional[int] = None
    cashier_account_id: int
    cash_register_id: Optional[int] = None
    cash_drawer_balance: float
    till_ids: list[int]


class CashierShiftStats(BaseModel):
    class ProductStats(BaseModel):
        product: Product
        quantity: int

    booked_products: list[ProductStats]


class CashierShift(BaseModel):
    id: int
    comment: str
    closing_out_user_id: int
    actual_cash_drawer_balance: float
    expected_cash_drawer_balance: float
    cash_drawer_imbalance: float
    started_at: datetime
    ended_at: datetime
