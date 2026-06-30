import enum
from typing import Optional

from pydantic import BaseModel, Field, computed_field

from stustapay.core.schema.user_tag import UserTag, format_user_tag_uid

ADMIN_ROLE_ID = 0
ADMIN_ROLE_NAME = "admin"


class EventPrivilege(enum.Enum):
    # general management privileges
    customer_management = "customer_management"
    payout_management = "payout_management"

    create_user = "create_user"

    # festival workflow privileges
    cash_transport = "cash_transport"
    terminal_login = "terminal_login"
    supervised_terminal_login = "supervised_terminal_login"

    # festival order / ticket / voucher flow privileges
    # which orders are available (sale, ticket, ...) is determined by the terminal profile
    grant_free_tickets = "grant_free_tickets"
    grant_vouchers = "grant_vouchers"


class NodePrivilege(enum.Enum):
    # general management privileges
    node_administration = "node_administration"

    view_node_stats = "view_node_stats"

    # festival order / ticket / voucher flow privileges
    # which orders are available (sale, ticket, ...) is determined by the terminal profile
    can_book_orders = "can_book_orders"


EVENT_PRIVILEGE_NAMES = frozenset(p.value for p in EventPrivilege)
NODE_PRIVILEGE_NAMES = frozenset(p.value for p in NodePrivilege)


class NewUserRole(BaseModel):
    name: str
    can_assign_all_roles: bool = False
    assignable_role_ids: list[int] = Field(default_factory=list)
    event_privileges: list[EventPrivilege]
    node_privileges: list[NodePrivilege]


class UserRole(NewUserRole):
    id: int
    node_id: int


class RoleToNode(BaseModel):
    node_id: int
    role_id: int


class NewUserToRoles(BaseModel):
    user_id: int
    role_ids: list[int]


class UserToRoles(NewUserToRoles):
    node_id: int


class UserRoleAssignment(BaseModel):
    user_id: int
    node_id: int
    node_name: str
    role_ids: list[int]
    roles: list[UserRole]


class AssignableUserRolesAtNode(BaseModel):
    node_id: int
    node_name: str
    roles: list[UserRole]


class UserRoleAssignmentPayload(BaseModel):
    node_id: int
    role_ids: list[int]


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
    cash_register_id: Optional[int] = None
    cash_drawer_balance: Optional[float] = None
    terminal_ids: list[int]

    @computed_field  # type: ignore[misc]
    @property
    def user_tag_uid_hex(self) -> Optional[str]:
        return format_user_tag_uid(self.user_tag_uid)


class User(UserWithoutId):
    id: int


class UserVoucherGrantStats(BaseModel):
    vouchers_granted: int


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
    event_privileges: list[EventPrivilege] = Field(default_factory=list)
    node_privileges: list[NodePrivilege] = Field(default_factory=list)
    description: Optional[str] = None
    user_tag_id: Optional[int] = None
    user_tag_uid: Optional[int] = None

    transport_account_id: Optional[int] = None
    cash_register_id: Optional[int] = None
