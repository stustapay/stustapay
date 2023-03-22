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
    button_ids: Optional[list[int]]


class TillLayout(NewTillLayout):
    id: int


class NewTillProfile(BaseModel):
    name: str
    description: str
    layout_id: int
    allow_top_up: bool


class TillProfile(NewTillProfile):
    id: int


class NewTill(BaseModel):
    name: str
    description: Optional[str]
    tse_id: Optional[str]
    active_shift: Optional[str]
    active_profile_id: int
    active_user_id: Optional[int]


class Till(NewTill):
    id: int
    session_uuid: Optional[UUID]
    registration_uuid: Optional[UUID]
