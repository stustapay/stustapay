from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from stustapay.core.schema.till import Till
from stustapay.core.schema.user import Privilege, UserRole


class NewTerminal(BaseModel):
    name: str
    description: str | None = None


class Terminal(NewTerminal):
    id: int
    node_id: int
    till_id: int | None
    session_uuid: UUID | None
    registration_uuid: UUID | None


class UserTagSecret(BaseModel):
    key0: str
    key1: str


class TerminalSecrets(BaseModel):
    sumup_affiliate_key: str
    sumup_api_key: str
    sumup_api_key_expires_at: datetime | None
    user_tag_secret: UserTagSecret


class TerminalButton(BaseModel):
    id: int
    name: str
    price: Optional[float]
    default_price: Optional[float] = None  # for variably priced products a default price might be interesting?
    price_in_vouchers: Optional[int] = None
    price_per_voucher: Optional[float] = None
    is_returnable: bool
    fixed_price: bool


class TerminalTillConfig(BaseModel):
    id: int
    name: str
    description: Optional[str]
    event_name: str
    profile_name: str
    user_privileges: Optional[list[Privilege]]
    cash_register_id: Optional[int]
    cash_register_name: Optional[str]
    allow_top_up: bool
    allow_cash_out: bool
    allow_ticket_sale: bool
    buttons: Optional[list[TerminalButton]]
    secrets: Optional[TerminalSecrets]
    active_user_id: Optional[int]

    available_roles: list[UserRole]


class TerminalConfig(BaseModel):
    id: int
    name: str
    description: str | None

    till: TerminalTillConfig | None

    test_mode: bool
    test_mode_message: str


class TerminalRegistrationSuccess(BaseModel):
    terminal: Terminal
    token: str


class CurrentTerminal(BaseModel):
    id: int
    node_id: int
    name: str
    description: str | None
    till: Till | None
