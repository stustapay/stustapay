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
