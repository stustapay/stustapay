import enum
from typing import Optional

from pydantic import BaseModel


class Privilege(enum.Enum):
    admin = "admin"
    orga = "orga"
    cashier = "cashier"


class UserWithoutId(BaseModel):
    name: str
    privileges: list[Privilege]
    description: Optional[str]


class User(UserWithoutId):
    id: int


class UserWithPassword(User):
    password: str
