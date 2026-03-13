# pylint: disable=unexpected-keyword-arg
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlsplit, urlunsplit

import asyncpg
from passlib.context import CryptContext
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import (
    AcceptInvitationPayload,
    CurrentUser,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    Privilege,
    RoleToNode,
    User,
    UserInvitation,
    UserRole,
    UserToRoles,
    UserWithoutId,
    format_user_tag_uid,
)
from stustapay.core.service.auth import AuthService, UserTokenMetadata
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.mail import MailService
from sftkit.error import AccessDenied, InvalidArgument, NotFound
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user_tag import get_or_assign_user_tag


class UserLoginSuccess(BaseModel):
    user: CurrentUser
    token: str


class UserLoginResult(BaseModel):
    class NodeChoice(BaseModel):
        node_id: int
        name: str
        description: str

    success: UserLoginSuccess | None
    available_nodes: list[NodeChoice] | None


async def fetch_user_to_roles(*, conn: Connection, node: Node, user_id: int) -> UserToRoles:
    curr_user_to_role = await conn.fetch_maybe_one(
        UserToRoles, "select * from user_to_roles_aggregated where node_id = $1 and user_id = $2", node.id, user_id
    )
    if curr_user_to_role is None:
        return UserToRoles(node_id=node.id, user_id=user_id, role_ids=[], terminal_only=False)
    return curr_user_to_role


async def fetch_user(*, conn: Connection, node: Node, user_id: int) -> User:
    user = await conn.fetch_maybe_one(
        User, "select * from user_with_tag where id = $1 and node_id = any($2)", user_id, node.ids_to_root
    )
    if user is None:
        raise NotFound(element_type="user", element_id=user_id)

    return user


async def update_user(*, conn: Connection, node: Node, user_id: int, user: NewUser) -> User:
    user_tag_id = None
    if user.user_tag_uid is not None:
        user_tag_id = await get_or_assign_user_tag(conn=conn, node=node, pin=user.user_tag_pin, uid=user.user_tag_uid)

    row = await conn.fetchrow(
        "update usr "
        "set login = $2, description = $3, display_name = $4, user_tag_id = $5, email = $6 "
        "where id = $1 and node_id = $7 returning id",
        user_id,
        user.login,
        user.description,
        user.display_name,
        user_tag_id,
        user.email,
        node.id,
    )
    if row is None:
        raise NotFound(element_type="user", element_id=str(user_id))

    return await fetch_user(conn=conn, node=node, user_id=user_id)


async def list_user_roles(*, conn: Connection, node: Node) -> list[UserRole]:
    return await conn.fetch_many(
        UserRole, "select * from user_role_with_privileges where node_id = any($1) order by name", node.ids_to_root
    )


async def get_user_privileges_at_node(*, conn: Connection, user_id: int, node_id: int) -> set[Privilege]:
    text_privileges = await conn.fetchval(
        "select privileges_at_node from user_privileges_at_node($1) where node_id = $2", user_id, node_id
    )
    privileges = set(Privilege[p] for p in text_privileges)
    return privileges


async def list_assignable_roles_for_user_at_node(*, conn: Connection, node: Node, user_id: int) -> list[UserRole]:
    all_roles = await list_user_roles(conn=conn, node=node)
    privileges = await get_user_privileges_at_node(conn=conn, node_id=node.id, user_id=user_id)
    allow_privileged_roles = Privilege.allow_privileged_role_assignment in privileges
    valid_roles = []
    for role in all_roles:
        if role.is_privileged and not allow_privileged_roles:
            continue

        if len(set(role.privileges).difference(privileges)) > 0 and not allow_privileged_roles:
            continue

        valid_roles.append(role)

    return valid_roles


async def _get_user_role(*, conn: Connection, role_id: int) -> Optional[UserRole]:
    return await conn.fetch_maybe_one(UserRole, "select * from user_role_with_privileges where id = $1", role_id)


async def associate_user_to_role(
    *, conn: Connection, current_user_id: int | None, node: Node, user_id: int, role_id: int
):
    user_node_id = await conn.fetchval(
        "select node_id from usr where node_id = any($1) and id = $2",
        node.ids_to_root,
        user_id,
    )
    if user_node_id is None:
        raise NotFound(element_type="user", element_id=user_id)

    user_node = await fetch_node(conn=conn, node_id=user_node_id)
    assert user_node is not None

    role = await conn.fetchrow(
        "select node_id, is_privileged, privileges from user_role_with_privileges where id = $1 and node_id = any($2)",
        role_id,
        user_node.ids_to_root,
    )
    if role is None:
        raise NotFound(element_type="user_role", element_id=role_id)

    if current_user_id is not None:  # we actually do permission checks
        privileges = await get_user_privileges_at_node(conn=conn, node_id=node.id, user_id=current_user_id)
        if Privilege.user_management not in privileges:
            raise AccessDenied("Privilege user_management is required to change user roles")

        can_assign_all_roles = Privilege.allow_privileged_role_assignment in privileges

        if role["is_privileged"] and not can_assign_all_roles:
            raise AccessDenied(
                f"Assigning privileged roles requires the {Privilege.allow_privileged_role_assignment} privilege"
            )

        if not can_assign_all_roles:
            role_privileges = set(Privilege[p] for p in role["privileges"])
            missing_user_roles = role_privileges.difference(privileges)
            if len(missing_user_roles) > 0:
                raise AccessDenied(
                    f"Assigning a role requires the assigning user to have all privileges of the new role. "
                    f"User is missing {missing_user_roles} privileges"
                )

    await conn.execute(
        "insert into user_to_role (node_id, user_id, role_id) values ($1, $2, $3)",
        node.id,
        user_id,
        role_id,
    )


class UserService(Service[Config]):
    INVITATION_TOKEN_HASH_PREFIX = "sha256:"

    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

    @classmethod
    def _hash_invitation_token(cls, token: str) -> str:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return f"{cls.INVITATION_TOKEN_HASH_PREFIX}{digest}"

    @staticmethod
    def _invitation_base_url(api_base_url: str) -> str:
        parsed = urlsplit(api_base_url)
        path = parsed.path.rstrip("/")
        if path.endswith("/api"):
            path = path[: -len("/api")]

        return urlunsplit((parsed.scheme, parsed.netloc, path, "", "")).rstrip("/")

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_user_roles(self, *, conn: Connection, node: Node) -> list[UserRole]:
        return await list_user_roles(conn=conn, node=node)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user([Privilege.user_management])
    async def create_user_role(self, *, conn: Connection, node: Node, new_role: NewUserRole) -> UserRole:
        role_id = await conn.fetchval(
            "insert into user_role (node_id, name, is_privileged) values ($1, $2, $3) returning id",
            node.id,
            new_role.name,
            new_role.is_privileged,
        )
        for privilege in new_role.privileges:
            await conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        assert role_id is not None
        role = await _get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        return role

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user([Privilege.user_management])
    async def update_user_role_privileges(
        self, *, conn: Connection, node: Node, role_id: int, is_privileged: bool, privileges: list[Privilege]
    ) -> UserRole:
        role = await _get_user_role(conn=conn, role_id=role_id)
        if role is None or role.node_id not in node.ids_to_root:
            raise NotFound(element_type="user_role", element_id=role_id)

        await conn.execute("update user_role set is_privileged = $2 where id = $1", role_id, is_privileged)

        await conn.execute("delete from user_role_to_privilege where role_id = $1", role_id)
        for privilege in privileges:
            await conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        role = await _get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        return role

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user([Privilege.user_management])
    async def delete_user_role(self, *, conn: Connection, node: Node, role_id: int) -> bool:
        result = await conn.execute(
            "delete from user_role where id = $1 and node_id = any($2)", role_id, node.ids_to_root
        )
        return result != "DELETE 0"

    async def _create_user(
        self,
        *,
        conn: Connection,
        node: Node,
        new_user: NewUser,
        creating_user_id: Optional[int],
        roles: list[RoleToNode] | None = None,
        password: Optional[str] = None,
    ) -> User:
        user_tag_id = None
        if new_user.user_tag_uid is not None:
            user_tag_id = await get_or_assign_user_tag(
                conn=conn, node=node, pin=new_user.user_tag_pin, uid=new_user.user_tag_uid
            )

            existing_user = await conn.fetchrow("select * from user_with_tag where user_tag_id = $1", user_tag_id)
            if existing_user is not None:
                raise InvalidArgument(f"User with tag id {new_user.user_tag_pin} already exists")

        hashed_password = None
        if password is not None:
            hashed_password = self._hash_password(password)
        elif user_tag_id is None:
            # Ensure database constraint (password_or_user_tag_id_set) is satisfied for users
            # without a user tag by assigning an unusable random password.
            temporary_password = secrets.token_urlsafe(32)
            hashed_password = self._hash_password(temporary_password)

        customer_account_id = None
        if new_user.user_tag_uid is not None:
            customer_account_id = await conn.fetchval(
                "select a.id from account a join user_tag ut on a.user_tag_id = ut.id where ut.uid = $1",
                new_user.user_tag_uid,
            )

        if customer_account_id is None:
            customer_account_id = await conn.fetchval(
                "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private') returning id",
                node.id,
                user_tag_id,
            )

        user_id = await conn.fetchval(
            "insert into usr (node_id, login, description, password, display_name, user_tag_id, "
            "   created_by, customer_account_id, email) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id",
            node.id,
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            user_tag_id,
            creating_user_id,
            customer_account_id,
            new_user.email,
        )
        for role in roles or []:
            role_node = await fetch_node(conn=conn, node_id=role.node_id)
            if role_node is None:
                raise InvalidArgument(
                    f"Could not associate user to role at node {role.node_id} since the node does not exist"
                )
            assert role_node is not None
            await associate_user_to_role(
                conn=conn,
                node=role_node,
                current_user_id=creating_user_id,
                user_id=user_id,
                role_id=role.role_id,
            )

        return await conn.fetch_one(User, "select * from user_with_tag where id = $1", user_id)

    @with_db_transaction
    async def create_user_no_auth(
        self,
        *,
        conn: Connection,
        node_id: int,
        new_user: NewUser,
        roles: list[RoleToNode] | None = None,
        password: Optional[str] = None,
    ) -> User:
        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        return await self._create_user(
            conn=conn, creating_user_id=None, node=node, new_user=new_user, password=password, roles=roles
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user([Privilege.create_user, Privilege.user_management])
    async def create_user(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_user: NewUser,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(
            conn=conn,
            creating_user_id=current_user.id,
            node=node,
            new_user=new_user,
            password=password,
        )

    @with_db_transaction
    @requires_terminal([Privilege.create_user, Privilege.user_management])
    async def create_user_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_user: NewUser,
        role_ids: list[int] | None = None,
    ) -> User:
        event_node = node
        if node.event_node_id is not None and node.event_node_id != node.id:
            n = await fetch_node(conn=conn, node_id=node.event_node_id)
            assert n is not None
            event_node = n

        actual_roles = None
        if role_ids is not None:
            actual_roles = [RoleToNode(node_id=node.id, role_id=r) for r in role_ids]
        return await self._create_user(
            node=event_node, conn=conn, creating_user_id=current_user.id, new_user=new_user, roles=actual_roles
        )

    @with_db_transaction
    @requires_terminal([Privilege.user_management])
    async def update_user_roles_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        user_tag_uid: int,
        role_ids: list[int],
    ) -> User:
        user_id = await conn.fetchval(
            "select id from user_with_tag where user_tag_uid = $1 and node_id = any($2)",
            user_tag_uid,
            node.ids_to_root,
        )
        if user_id is None:
            raise InvalidArgument(f"User with tag uid {format_user_tag_uid(user_tag_uid)} does not exist")

        roles = await conn.fetch_many(
            UserRole,
            "select ur.* from user_role_with_privileges ur join user_to_role utr on ur.id = utr.role_id "
            "where utr.node_id = $1 and utr.user_id = $2",
            node.id,
            user_id,
        )
        if any([role.is_privileged for role in roles]):
            raise InvalidArgument("This user has privileged roles assigned, updates are not allowed at a terminal")

        await self.update_user_to_roles(
            conn=conn,
            node=node,
            current_user=current_user,
            user_to_roles=NewUserToRoles(user_id=user_id, role_ids=role_ids),
        )

        return await conn.fetch_one(User, "select * from user_with_tag where id = $1", user_id)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_users(
        self, *, conn: Connection, node: Node, filter_privilege: Privilege | None = None
    ) -> list[User]:
        if filter_privilege is None:
            return await conn.fetch_many(
                User, "select * from user_with_tag where node_id = any($1) order by login", node.ids_to_root
            )

        return await conn.fetch_many(
            User,
            "with users_by_privilege as ("
            "   select "
            "       u.*, "
            "       (select exists(select from user_privileges_at_node(u.id) up "
            "       where $2 = any(up.privileges_at_node) and up.node_id = any($1))) as has_privilege "
            "   from user_with_tag u "
            "   where u.node_id = any($1)"
            ")"
            "select * from users_by_privilege where has_privilege",
            node.ids_to_root,
            filter_privilege.name if filter_privilege is not None else None,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.user_management])
    async def get_user(self, *, conn: Connection, node: Node, user_id: int) -> Optional[User]:
        return await fetch_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user([Privilege.user_management])
    async def update_user(self, *, conn: Connection, node: Node, user_id: int, user: UserWithoutId) -> Optional[User]:
        return await update_user(conn=conn, node=node, user_id=user_id, user=user)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user([Privilege.user_management])
    async def change_user_password(
        self, *, conn: Connection, node: Node, user_id: int, new_password: str
    ) -> Optional[User]:
        new_password_hashed = self._hash_password(new_password)

        ret = await conn.execute(
            "update usr set password = $2 where id = $1 and node_id = $3 returning id",
            user_id,
            new_password_hashed,
            node.id,
        )
        if ret is None:
            raise InvalidArgument("User not found")
        return await fetch_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user([Privilege.user_management])
    async def delete_user(self, *, conn: Connection, node: Node, user_id: int) -> bool:
        result = await conn.execute(
            "delete from usr where id = $1 and node_id = $2",
            user_id,
            node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_user_to_roles(self, *, conn: Connection, node: Node) -> list[UserToRoles]:
        return await conn.fetch_many(
            UserToRoles, "select * from user_to_roles_aggregated where node_id = any($1)", node.ids_to_root
        )

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.user_management])
    async def update_user_to_roles(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_to_roles: NewUserToRoles
    ) -> UserToRoles:
        print("updating user to roles ...")
        if len(user_to_roles.role_ids) == 0:
            await conn.execute(
                "delete from user_to_role where node_id = $1 and user_id = $2", node.id, user_to_roles.user_id
            )
            return UserToRoles(node_id=node.id, user_id=user_to_roles.user_id, role_ids=[])

        curr_user_to_role = await conn.fetch_maybe_one(
            UserToRoles,
            "select * from user_to_roles_aggregated where node_id = $1 and user_id = $2",
            node.id,
            user_to_roles.user_id,
        )
        role_ids_to_remove = set()
        if curr_user_to_role is None:
            role_ids_to_add = set(user_to_roles.role_ids)
        else:
            role_ids_to_add = set(user_to_roles.role_ids).difference(set(curr_user_to_role.role_ids))
            role_ids_to_remove = set(curr_user_to_role.role_ids).difference(set(user_to_roles.role_ids))

        for role_id in role_ids_to_add:
            await associate_user_to_role(
                conn=conn,
                node=node,
                current_user_id=current_user.id,
                user_id=user_to_roles.user_id,
                role_id=role_id,
            )
        if len(role_ids_to_remove) > 0:
            await conn.execute(
                "delete from user_to_role where node_id = $1 and user_id = $2 and role_id = any($3)",
                node.id,
                user_to_roles.user_id,
                role_ids_to_remove,
            )

        return await fetch_user_to_roles(conn=conn, node=node, user_id=user_to_roles.user_id)

    @with_db_transaction
    async def login_user(
        self, *, conn: Connection, username: str, password: str, node_id: int | None = None
    ) -> UserLoginResult:
        if node_id is None:
            potential_users = await conn.fetch("select * from usr where login = $1", username)
        else:
            potential_users = await conn.fetch("select * from usr where login = $1 and node_id = $2", username, node_id)
        if len(potential_users) == 0:
            raise AccessDenied("Invalid username or password")

        users_with_matching_passwords = []
        for row in potential_users:
            user_id = row["id"]
            if self._check_password(password, row["password"]):
                users_with_matching_passwords.append(row)

        if len(users_with_matching_passwords) == 0:
            raise AccessDenied("Invalid username or password")

        if len(users_with_matching_passwords) > 1:
            node_ids = [row["node_id"] for row in users_with_matching_passwords]
            nodes = await conn.fetch_many(
                UserLoginResult.NodeChoice,
                "select id as node_id, name, description from node n where id = any($1)",
                node_ids,
            )
            return UserLoginResult(success=None, available_nodes=nodes)

        logged_in_user = users_with_matching_passwords[0]
        user_id = logged_in_user["id"]
        session_id = await conn.fetchval("insert into usr_session (usr) values ($1) returning id", user_id)
        token = self.auth_service.create_user_access_token(UserTokenMetadata(user_id=user_id, session_id=session_id))
        user = await self.auth_service.get_user_from_token(conn=conn, token=token)
        return UserLoginResult(
            available_nodes=None,
            success=UserLoginSuccess(
                user=user,
                token=token,
            ),
        )

    @with_db_transaction
    @requires_user(node_required=False)
    async def change_password(
        self, *, conn: Connection, current_user: CurrentUser, old_password: str, new_password: str
    ):
        old_password_hashed = await conn.fetchval("select password from usr where id = $1", current_user.id)
        assert old_password_hashed is not None
        if not self._check_password(old_password, old_password_hashed):
            raise AccessDenied("Invalid password")

        new_password_hashed = self._hash_password(new_password)

        await conn.execute("update usr set password = $2 where id = $1", current_user.id, new_password_hashed)

    @with_db_transaction
    @requires_user(node_required=False)
    async def logout_user(self, *, conn: Connection, current_user: User, token: str) -> bool:
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        assert token_payload is not None
        assert current_user.id == token_payload.user_id

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user([Privilege.user_management])
    async def invite_user(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        user_id: int,
        mail_service: MailService,
    ) -> UserInvitation:
        # Fetch user to check email and password
        user = await fetch_user(conn=conn, node=node, user_id=user_id)
        if user.email is None or user.email == "":
            raise InvalidArgument("User must have an email address to be invited")

        # Check if user already has a password
        user_password = await conn.fetchval("select password from usr where id = $1", user_id)
        if user_password is not None and user_password != "":
            # User already has password, but we can still send invitation as a reminder
            pass

        # Generate secure token
        token = secrets.token_urlsafe(32)
        token_hash = self._hash_invitation_token(token)

        # Check for existing active invitation
        existing_invitation = await conn.fetchrow(
            "select * from user_invitation where user_id = $1 and accepted_at is null",
            user_id,
        )

        expires_at = datetime.now() + timedelta(days=7)

        if existing_invitation:
            # Update existing invitation
            invitation_id = existing_invitation["id"]
            await conn.execute(
                "update user_invitation set token = $1, expires_at = $2, created_by = $3 where id = $4",
                token_hash,
                expires_at,
                current_user.id,
                invitation_id,
            )
        else:
            # Create new invitation
            invitation_id = await conn.fetchval(
                "insert into user_invitation (user_id, token, node_id, expires_at, created_by) "
                "values ($1, $2, $3, $4, $5) returning id",
                user_id,
                token_hash,
                node.id,
                expires_at,
                current_user.id,
            )

        # Fetch node info for email
        node_info = await conn.fetchrow("select name, description from node where id = $1", node.id)
        node_name = node_info["name"] if node_info else "Node"

        # Construct invitation URL from the configured administration API base URL.
        # We only remove a trailing '/api' path segment to avoid modifying the host
        # (e.g. https://api.example.com/api -> https://api.example.com).
        base_url = self._invitation_base_url(self.config.administration.base_url)
        invitation_url = f"{base_url}/accept-invitation?token={token}"

        # Create email message
        subject = f"Invitation to manage {node_name}"
        message = f"""Hello {user.display_name},

You have been invited to manage {node_name} in the StuStaPay administration portal.

To activate your account, please click the following link and set your password:
{invitation_url}

This invitation will expire on {expires_at.strftime('%Y-%m-%d %H:%M')}.

If you did not expect this invitation, please ignore this email.

Best regards,
The StuStaPay Team
"""

        # Send email
        await mail_service.send_mail(
            conn=conn,
            node_id=node.id,
            subject=subject,
            message=message,
            to_addr=user.email,
        )

        # Fetch and return invitation
        invitation = await conn.fetchrow(
            "select id, user_id, node_id, created_at, expires_at, accepted_at, created_by "
            "from user_invitation where id = $1",
            invitation_id,
        )
        assert invitation is not None
        return UserInvitation(
            id=invitation["id"],
            user_id=invitation["user_id"],
            token=token,
            node_id=invitation["node_id"],
            created_at=invitation["created_at"],
            expires_at=invitation["expires_at"],
            accepted_at=invitation["accepted_at"],
            created_by=invitation["created_by"],
        )

    @with_db_transaction
    async def accept_invitation(
        self, *, conn: Connection, payload: AcceptInvitationPayload
    ) -> dict[str, str]:
        if payload.token.startswith(self.INVITATION_TOKEN_HASH_PREFIX):
            # Do not allow using already-hashed tokens directly; the raw token must be provided.
            raise AccessDenied("Invalid invitation token")

        token_hash = self._hash_invitation_token(payload.token)
        # Find invitation by token
        invitation = await conn.fetchrow(
            "select * from user_invitation "
            "where token = $1 "
            "   or (token = $2 and token not like $3)",
            token_hash,
            payload.token,
            f"{self.INVITATION_TOKEN_HASH_PREFIX}%",
        )

        if invitation is None:
            raise AccessDenied("Invalid invitation token")

        if not str(invitation["token"]).startswith(self.INVITATION_TOKEN_HASH_PREFIX):
            await conn.execute("update user_invitation set token = $1 where id = $2", token_hash, invitation["id"])

        # Check if already accepted
        if invitation["accepted_at"] is not None:
            raise InvalidArgument("This invitation has already been accepted")

        # Check if expired
        expires_at = invitation["expires_at"]
        if expires_at < datetime.now():
            raise InvalidArgument("This invitation has expired")

        user_id = invitation["user_id"]

        # Set user password
        hashed_password = self._hash_password(payload.password)
        await conn.execute("update usr set password = $1 where id = $2", hashed_password, user_id)

        # Mark invitation as accepted
        await conn.execute(
            "update user_invitation set accepted_at = $1 where id = $2",
            datetime.now(),
            invitation["id"],
        )

        return {"status": "success", "message": "Password set successfully. You can now log in."}
