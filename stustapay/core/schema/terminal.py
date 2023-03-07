from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from stustapay.core.schema.user import Privilege


class NewTerminalButton(BaseModel):
    name: str
    product_ids: list[int]


class TerminalButton(NewTerminalButton):
    id: int
    price: float


class NewTerminalLayout(BaseModel):
    name: str
    description: str
    allow_top_up: bool
    button_ids: Optional[list[int]]


class TerminalLayout(NewTerminalLayout):
    id: int


class NewTerminalProfile(BaseModel):
    name: str
    description: str
    layout_id: int


class TerminalProfile(NewTerminalProfile):
    id: int


class FullTerminalLayout(BaseModel):
    id: int
    name: str
    description: str
    allow_top_up: bool
    buttons: Optional[list[TerminalButton]]


class FullTerminalProfile(BaseModel):
    id: int
    name: str
    description: str
    layout: FullTerminalLayout


class TerminalConfig(BaseModel):
    id: int
    name: str
    description: Optional[str]
    cashier_privileges: Optional[list[Privilege]]
    profile: FullTerminalProfile


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
