from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class LayoutProduct(BaseModel):
    product_id: int
    sequence_number: int


class NewTerminalLayout(BaseModel):
    name: str
    description: str
    products: list[LayoutProduct] = []


class TerminalLayout(NewTerminalLayout):
    id: int


class NewTerminalProfile(BaseModel):
    name: str
    description: str
    layout_id: int


class TerminalProfile(NewTerminalProfile):
    id: int


class NewTerminal(BaseModel):
    name: str
    description: Optional[str]
    tse_id: Optional[str]
    active_shift: Optional[str]
    active_profile_id: int
    active_cashier_id: Optional[int]


class Terminal(NewTerminal):
    id: int
    session_uuid: Optional[UUID]
    registration_uuid: Optional[UUID]
