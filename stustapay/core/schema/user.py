import enum
from typing import Optional

from pydantic import BaseModel


class Privilege(enum.Enum):
    admin = "admin"
    # orga = "orga"
    finanzorga = "finanzorga"
    cashier = "cashier"


class UserWithoutId(BaseModel):
    name: str
    privileges: list[Privilege]
    description: Optional[str]
    user_tag: Optional[int]
    transport_account_id: Optional[int]
    cashier_account_id: Optional[int]


class User(UserWithoutId):
    id: int


class UserWithPassword(User):
    password: str
