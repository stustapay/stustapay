from dataclasses import dataclass
from typing import Optional


@dataclass
class NewTerminal:
    name: str
    description: Optional[str]
    tseid: Optional[str]
    active_shift: Optional[str]
    active_profile: Optional[int]
    active_cashier: Optional[int]


@dataclass
class Terminal(NewTerminal):
    id: int
    registration_uuid: Optional[str]
