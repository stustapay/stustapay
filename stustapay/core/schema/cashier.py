from datetime import datetime
from typing import Optional

from stustapay.core.util import BaseModel


class Cashier(BaseModel):
    id: int
    login: str
    display_name: str
    description: Optional[str] = None
    user_tag_uid: Optional[int] = None
    transport_account_id: Optional[int] = None
    cashier_account_id: Optional[int] = None
    cash_drawer_balance: float
    till_id: Optional[int]


class CashierShift(BaseModel):
    id: int
    comment: str
    closing_out_user_id: int
    final_cash_drawer_balance: float
    final_cash_drawer_imbalance: float
    started_at: datetime
    ended_at: datetime
