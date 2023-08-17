from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel


class NewPayoutRun(BaseModel):
    execution_date: date
    max_payout_sum: float


class PayoutRun(BaseModel):
    id: int
    created_by: str
    created_at: datetime
    execution_date: date


class PendingPayoutDetail(BaseModel):
    total_payout_amount: float
    total_donation_amount: float
    n_payouts: int


class PayoutRunWithStats(PayoutRun):
    total_donation_amount: float
    total_payout_amount: float
    n_payouts: int


class Payout(BaseModel):
    customer_account_id: int
    iban: str
    account_name: str
    email: str
    user_tag_uid: int
    balance: float
    payout_run_id: Optional[int]
