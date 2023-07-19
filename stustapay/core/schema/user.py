import enum
from typing import Optional

from pydantic import BaseModel, computed_field

ADMIN_ROLE_ID = 0
ADMIN_ROLE_NAME = "admin"
FINANZORGA_ROLE_ID = 1
FINANZORGA_ROLE_NAME = "finanzorga"
CASHIER_ROLE_ID = 2
CASHIER_ROLE_NAME = "cashier"
STANDLEITER_ROLE_ID = 3
INFOZELT_ROLE_ID = 4
INFOZELT_ROLE_NAME = "infozelt helfer"


def format_user_tag_uid(uid: Optional[int]) -> Optional[str]:
    if uid is None:
        return None

    return hex(uid)[2:].upper()


class UserTag(BaseModel):
    uid: int


class Privilege(enum.Enum):
    # general management privileges
    account_management = "account_management"
    cashier_management = "cashier_management"
    config_management = "config_management"
    product_management = "product_management"
    tax_rate_management = "tax_rate_management"
    user_management = "user_management"
    till_management = "till_management"
    order_management = "order_management"
    festival_overview = "festival_overview"

    # festival workflow privileges
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


class CheckLoginResult(BaseModel):
    user_tag: UserTag
    roles: list[UserRole]


class LoginPayload(BaseModel):
    user_tag: UserTag
    user_role_id: int


class NewUser(BaseModel):
    login: str
    display_name: str = ""
    user_tag_uid: int
    role_names: list[str]
    description: Optional[str] = None


class UserWithoutId(BaseModel):
    login: str
    display_name: str
    role_names: list[str]
    description: Optional[str] = None
    user_tag_uid: Optional[int] = None
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
