from dataclasses import dataclass
from typing import Optional

from stustapay.core.util import _to_string_nullable


@dataclass
class NewTerminalLayout:
    name: str
    description: str
    config: dict


@dataclass
class TerminalLayout(NewTerminalLayout):
    id: int

    @classmethod
    def from_db(cls, row) -> "TerminalLayout":
        return cls(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            config=row["config"],
        )


@dataclass
class NewTerminalProfile:
    name: str
    description: str
    layout_id: Optional[int]


@dataclass
class TerminalProfile(NewTerminalProfile):
    id: int

    @classmethod
    def from_db(cls, row) -> "TerminalProfile":
        return cls(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            layout_id=row["layout_id"],
        )


@dataclass
class NewTerminal:
    name: str
    description: Optional[str]
    tse_id: Optional[str]
    active_shift: Optional[str]
    active_profile_id: Optional[int]
    active_cashier_id: Optional[int]


@dataclass
class Terminal(NewTerminal):
    id: int
    is_logged_in: bool
    registration_uuid: Optional[str]

    @classmethod
    def from_db(cls, row) -> "Terminal":
        return cls(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            is_logged_in=row["session_uuid"] is not None,
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tse_id=row["tse_id"],
            active_shift=row["active_shift"],
            active_profile_id=row["active_profile_id"],
            active_cashier_id=row["active_cashier_id"],
        )
