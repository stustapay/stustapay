import enum
from typing import Optional

from pydantic import BaseModel


class Privilege(enum.Enum):
    admin = "admin"
    # orga = "orga"
    finanzorga = "finanzorga"
    cashier = "cashier"
    grant_free_tickets = "grant_free_tickets"


class NewUser(BaseModel):
    login: str
    display_name: str = ""
    user_tag_uid: int


class UserWithoutId(BaseModel):
    login: str
    display_name: str
    privileges: list[Privilege]
    description: Optional[str] = None
    user_tag_uid: Optional[int] = None
    transport_account_id: Optional[int] = None
    cashier_account_id: Optional[int] = None


class User(UserWithoutId):
    id: int


class UserWithPassword(User):
    password: str


class UserTag(BaseModel):
    uid: int
