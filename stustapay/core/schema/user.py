import enum
from typing import Optional

from pydantic import BaseModel, computed_field

ADMIN_ROLE_ID = 0
ADMIN_ROLE_NAME = "admin"


def format_user_tag_uid(uid: Optional[int]) -> Optional[str]:
    if uid is None:
        return None

    return hex(uid)[2:].upper()


class UserTag(BaseModel):
    uid: int


class Privilege(enum.Enum):
    # general management privileges
    node_administration = "node_administration"
    user_management = "user_management"

    # festival workflow privileges
    cash_transport = "cash_transport"
    terminal_login = "terminal_login"
    supervised_terminal_login = "supervised_terminal_login"

    # festival order / ticket / voucher flow privileges
    # which orders are available (sale, ticket, ...) is determined by the terminal profile
    can_book_orders = "can_book_orders"
    grant_free_tickets = "grant_free_tickets"
    grant_vouchers = "grant_vouchers"


class NewUserRole(BaseModel):
    name: str
    is_privileged: bool = False
    privileges: list[Privilege]


class UserRole(NewUserRole):
    id: int
    node_id: int


class NewUserToRole(BaseModel):
    user_id: int
    role_id: int


class UserToRole(NewUserToRole):
    node_id: int


class CheckLoginResult(BaseModel):
    user_tag: UserTag
    roles: list[UserRole]


class LoginPayload(BaseModel):
    user_tag: UserTag
    user_role_id: int


class NewUser(BaseModel):
    login: str
    display_name: str
    user_tag_uid: Optional[int] = None
    description: Optional[str] = None


class UserWithoutId(NewUser):
    node_id: int
    transport_account_id: Optional[int] = None
    cashier_account_id: Optional[int] = None

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)


class User(UserWithoutId):
    id: int


class UserWithPassword(User):
    password: str


class CurrentUser(BaseModel):
    """
    Describes a logged-in user in the system
    """

    node_id: int
    id: int
    login: str
    display_name: str
    active_role_id: Optional[int] = None
    active_role_name: Optional[str] = None
    privileges: list[Privilege]
    description: Optional[str] = None
    user_tag_uid: Optional[int] = None

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)

    transport_account_id: Optional[int] = None
    cashier_account_id: Optional[int] = None
    cash_register_id: Optional[int] = None
