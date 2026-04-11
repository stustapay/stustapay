import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from stustapay.core.schema.entry import EntryAreaConfig
from stustapay.core.schema.till import Till
from stustapay.core.schema.user import Privilege, UserRole


class TerminalMode(enum.Enum):
    till = "till"
    entry = "entry"
    exit = "exit"


class NewTerminal(BaseModel):
    name: str
    description: str | None = None
    mode: TerminalMode = TerminalMode.till
    entry_area_id: int | None = None
    self_service: bool = False


class Terminal(NewTerminal):
    id: int
    node_id: int
    till_id: int | None
    session_uuid: UUID | None
    registration_uuid: UUID | None
    active_user_id: Optional[int] = None
    active_user_role_id: Optional[int] = None


class UserTagSecret(BaseModel):
    key0: str
    key1: str


class TerminalUserTagSecrets(BaseModel):
    user_tag_secret: UserTagSecret


class TerminalSumupSecrets(BaseModel):
    sumup_affiliate_key: str
    sumup_api_key: str
    sumup_api_key_expires_at: datetime | None


# Combined secrets class for Android app compatibility
class TerminalSecrets(BaseModel):
    # SumUp secrets fields required by Android
    sumup_affiliate_key: str = ""
    sumup_api_key: str = ""
    sumup_api_key_expires_at: Optional[datetime] = None
    # User tag secret
    user_tag_secret: Optional[UserTagSecret] = None


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
    cash_register_id: Optional[int]
    cash_register_name: Optional[str]
    allow_top_up: bool
    allow_cash_out: bool
    allow_ticket_sale: bool
    allow_ticket_vouchers: bool
    enable_ssp_payment: bool
    enable_cash_payment: bool
    enable_card_payment: bool
    buttons: Optional[list[TerminalButton]]
    sumup_secrets: Optional[TerminalSumupSecrets]
    post_payment_allowed: bool
    sumup_payment_enabled: bool
    
    # Add required fields that were missing
    user_privileges: Optional[list[Privilege]]
    secrets: Optional[TerminalSecrets]
    active_user_id: Optional[int]
    available_roles: list[UserRole]


class TerminalConfig(BaseModel):
    id: int
    name: str
    description: str | None
    mode: TerminalMode
    entry_area: EntryAreaConfig | None
    self_service: bool

    event_name: str
    active_user_id: Optional[int]
    available_roles: list[UserRole]
    user_privileges: Optional[list[Privilege]]
    secrets: Optional[TerminalSecrets]

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
    mode: TerminalMode
    entry_area_id: int | None
    self_service: bool
    active_user_id: int | None
    active_user_role_id: int | None
    till: Till | None


class HeadwindDeviceMapping(BaseModel):
    id: int
    node_id: int
    terminal_id: int
    headwind_device_id: str
    headwind_device_number: str | None = None
    headwind_device_name: str | None = None
    headwind_device_serial: str | None = None
    headwind_device_model: str | None = None
    last_synced_at: datetime | None = None
    last_token_pushed_at: datetime | None = None
    last_push_status: str | None = None
    last_push_error: str | None = None
    last_wifi_pushed_at: datetime | None = None
    last_wifi_push_status: str | None = None
    last_wifi_push_error: str | None = None
    created_at: datetime
    updated_at: datetime


class HeadwindDeviceMappingWithTerminal(HeadwindDeviceMapping):
    terminal_name: str
    terminal_description: str | None = None
