from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.till import TillButton, Till
from stustapay.core.schema.user import Privilege


class Terminal(BaseModel):
    till: Till


class TerminalConfig(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_privileges: Optional[list[Privilege]]
    allow_top_up: bool
    buttons: Optional[list[TillButton]]
