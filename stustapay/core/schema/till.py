from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.user import Privilege, User


class NewTillButton(BaseModel):
    name: str
    product_ids: list[int]


class TillButton(NewTillButton):
    node_id: int
    id: int
    price: float


class NewTillLayout(BaseModel):
    name: str
    description: str
    button_ids: Optional[list[int]] = None
    ticket_ids: Optional[list[int]] = None


class TillLayout(NewTillLayout):
    node_id: int
    id: int


class NewTillProfile(BaseModel):
    name: str
    description: Optional[str] = None
    layout_id: int
    allow_top_up: bool
    allow_cash_out: bool
    allow_ticket_sale: bool
    enable_ssp_payment: bool
    enable_cash_payment: bool
    enable_card_payment: bool


class TillProfile(NewTillProfile):
    node_id: int
    id: int


class NewTill(BaseModel):
    name: str
    description: Optional[str] = None
    active_shift: Optional[str] = None
    active_profile_id: int
    terminal_id: int | None = None


class Till(NewTill):
    node_id: int
    id: int
    z_nr: int

    active_cash_register_id: Optional[int] = None
    current_cash_register_name: Optional[str] = None
    current_cash_register_balance: Optional[float] = None

    tse_id: Optional[int] = None
    tse_serial: Optional[str] = None


class NewCashRegister(BaseModel):
    name: str


class CashRegister(NewCashRegister):
    node_id: int
    id: int
    current_cashier_id: Optional[int]
    current_till_id: Optional[int]
    balance: float
    account_id: int


class NewCashRegisterStocking(BaseModel):
    name: str
    euro200: int = 0
    euro100: int = 0
    euro50: int = 0
    euro20: int = 0
    euro10: int = 0
    euro5: int = 0
    euro2: int = 0
    euro1: int = 0
    cent50: int = 0
    cent20: int = 0
    cent10: int = 0
    cent5: int = 0
    cent2: int = 0
    cent1: int = 0
    variable_in_euro: float = 0.0


class CashRegisterStocking(NewCashRegisterStocking):
    node_id: int
    id: int
    total: float


class UserRoleInfo(BaseModel):
    id: int
    name: str
    is_privileged: bool
    privileges: list[Privilege]

    node_id: int
    node_name: str

    is_at_current_node: bool


class UserInfo(User):
    user_tag_uid: int
    cash_register_id: Optional[int] = None
    cash_register_name: Optional[str] = None
    cash_drawer_balance: Optional[float] = None
    transport_account_balance: Optional[float] = None

    assigned_roles: list[UserRoleInfo]
