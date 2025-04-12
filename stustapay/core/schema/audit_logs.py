from datetime import datetime
from enum import StrEnum, auto

from pydantic import BaseModel


class AuditType(StrEnum):
    node_created = auto()
    node_updated = auto()
    node_archived = auto()
    node_deleted = auto()
    event_created = auto()
    event_updated = auto()

    account_disabled = auto()
    account_comment_updated = auto()
    account_user_tag_changed = auto()
    customer_payout_prevention_changed = auto()

    till_created = auto()
    till_updated = auto()
    till_deleted = auto()
    till_button_created = auto()
    till_button_updated = auto()
    till_button_deleted = auto()
    till_layout_created = auto()
    till_layout_updated = auto()
    till_layout_deleted = auto()
    till_profile_created = auto()
    till_profile_updated = auto()
    till_profile_deleted = auto()
    cash_register_created = auto()
    cash_register_updated = auto()
    cash_register_stocked_up = auto()
    cash_register_transferred = auto()
    cash_register_deleted = auto()
    cash_register_stocking_created = auto()
    cash_register_stocking_updated = auto()
    cash_register_stocking_deleted = auto()
    terminal_created = auto()
    terminal_updated = auto()
    terminal_deleted = auto()
    terminal_registered = auto()
    terminal_to_till_changed = auto()
    till_to_terminal_changed = auto()
    terminal_user_logged_in = auto()
    tax_rate_created = auto()
    tax_rate_updated = auto()
    tax_rate_deleted = auto()
    product_created = auto()
    product_updated = auto()
    product_deleted = auto()
    ticket_created = auto()
    ticket_updated = auto()
    ticket_deleted = auto()
    tse_created = auto()
    tse_updated = auto()
    user_created = auto()
    user_updated = auto()
    user_password_changed = auto()
    user_to_roles_updated = auto()
    user_deleted = auto()
    cashier_closed_out = auto()
    cashier_account_balance_changed = auto()
    transport_account_balance_changed = auto()
    user_role_created = auto()
    user_role_updated = auto()
    user_role_deleted = auto()
    user_tags_created = auto()
    user_tag_secret_created = auto()
    user_tag_comment_updated = auto()

    payout_run_created = auto()
    payout_run_marked_done = auto()
    payout_run_revoked = auto()


class AuditLog(BaseModel):
    id: int
    created_at: datetime
    node_id: int
    # we use the AuditType in all of the backend code to make it typesafe but from a database schema perspective its just a plain string
    log_type: str
    originating_user_id: int | None
    originating_terminal_id: int | None


class AuditLogDetail(AuditLog):
    content: dict
