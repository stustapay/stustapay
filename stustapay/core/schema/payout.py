from datetime import datetime

from pydantic import BaseModel, computed_field

from stustapay.core.schema.user import format_user_tag_uid


class NewPayoutRun(BaseModel):
    max_payout_sum: float
    max_num_payouts: int


class PayoutRun(BaseModel):
    id: int
    node_id: int
    created_by: int | None
    created_at: datetime
    set_done_by: int | None
    set_done_at: datetime | None
    done: bool
    revoked: bool
    sepa_was_generated: bool


class PendingPayoutDetail(BaseModel):
    total_payout_amount: float
    total_donation_amount: float
    n_payouts: int


class PayoutRunWithStats(PayoutRun):
    total_donation_amount: float
    total_payout_amount: float
    n_payouts: int


class Payout(BaseModel):
    id: int
    customer_account_id: int
    iban: str | None
    account_name: str | None
    email: str | None
    user_tag_id: int
    user_tag_uid: int

    amount: float
    donation: float
    payout_run_id: int

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> str | None:
        return format_user_tag_uid(self.user_tag_uid)
