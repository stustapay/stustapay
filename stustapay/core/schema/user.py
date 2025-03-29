import enum
from typing import Optional

from pydantic import BaseModel, computed_field

from stustapay.core.schema.user_tag import UserTag, format_user_tag_uid

ADMIN_ROLE_ID = 0
ADMIN_ROLE_NAME = "admin"


class Privilege(enum.Enum):
    # general management privileges
    node_administration = "node_administration"
    customer_management = "customer_management"
    payout_management = "payout_management"

    create_user = "create_user"
    allow_privileged_role_assignment = "allow_privileged_role_assignment"
    user_management = "user_management"

    view_node_stats = "view_node_stats"

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


class RoleToNode(BaseModel):
    node_id: int
    role_id: int


class NewUserToRoles(BaseModel):
    user_id: int
    role_ids: list[int]
    terminal_only: bool = False


class UserToRoles(NewUserToRoles):
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
    user_tag_pin: Optional[str] = None
    user_tag_uid: Optional[int] = None
    description: Optional[str] = None


class UserWithoutId(NewUser):
    node_id: int
    user_tag_id: Optional[int] = None
    transport_account_id: Optional[int] = None

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
    user_tag_id: Optional[int] = None
    user_tag_uid: Optional[int] = None

    transport_account_id: Optional[int] = None
    cash_register_id: Optional[int] = None
