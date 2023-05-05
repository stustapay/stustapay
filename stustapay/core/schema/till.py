from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NewTillButton(BaseModel):
    name: str
    product_ids: list[int]


class TillButton(NewTillButton):
    id: int
    price: float


class NewTillLayout(BaseModel):
    name: str
    description: str
    button_ids: Optional[list[int]] = None


class TillLayout(NewTillLayout):
    id: int


class NewTillProfile(BaseModel):
    name: str
    description: Optional[str] = None
    layout_id: int
    allow_top_up: bool
    allow_cash_out: bool
    allow_ticket_sale: bool
    allowed_role_names: list[str]


class TillProfile(NewTillProfile):
    id: int


class NewTill(BaseModel):
    name: str
    description: Optional[str] = None
    tse_id: Optional[str] = None
    active_shift: Optional[str] = None
    active_profile_id: int


class Till(NewTill):
    id: int
    session_uuid: Optional[UUID] = None
    registration_uuid: Optional[UUID] = None
    active_user_id: Optional[int] = None
    active_user_role_id: Optional[int] = None


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
    id: int
    total: float
