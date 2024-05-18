# pylint: disable=unexpected-keyword-arg
from typing import Optional

import asyncpg
from passlib.context import CryptContext
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import (
    CurrentUser,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    Privilege,
    RoleToNode,
    User,
    UserRole,
    UserToRoles,
    UserWithoutId,
    format_user_tag_uid,
)
from stustapay.core.service.auth import AuthService, UserTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
    with_db_transaction,
    with_retryable_db_transaction,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument, NotFound
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user_tag import get_or_assign_user_tag
from stustapay.framework.database import Connection


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
        return UserToRoles(node_id=node.id, user_id=user_id, role_ids=[])
    return curr_user_to_role


async def fetch_user(*, conn: Connection, node: Node, user_id: int) -> User:
    user = await conn.fetch_maybe_one(
        User, "select * from user_with_roles where id = $1 and node_id = any($2)", user_id, node.ids_to_root
    )
    if user is None:
        raise NotFound(element_typ="user", element_id=user_id)

    return user


async def update_user(*, conn: Connection, node: Node, user_id: int, user: NewUser) -> User:
    user_tag_id = None
    if user.user_tag_uid is not None:
        user_tag_id = await get_or_assign_user_tag(conn=conn, node=node, pin=user.user_tag_pin, uid=user.user_tag_uid)

    row = await conn.fetchrow(
        "update usr "
        "set login = $2, description = $3, display_name = $4, user_tag_id = $5 "
        "where id = $1 and node_id = $6 returning id",
        user_id,
        user.login,
        user.description,
        user.display_name,
        user_tag_id,
        node.id,
    )
    if row is None:
        raise NotFound(element_typ="user", element_id=str(user_id))

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
        raise NotFound(element_typ="user", element_id=user_id)

    user_node = await fetch_node(conn=conn, node_id=user_node_id)
    assert user_node is not None

    role = await conn.fetchrow(
        "select node_id, is_privileged, privileges from user_role_with_privileges "
        "where id = $1 and node_id = any($2)",
        role_id,
        user_node.ids_to_root,
    )
    if role is None:
        raise NotFound(element_typ="user_role", element_id=role_id)

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


class UserService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

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
            raise NotFound(element_typ="user_role", element_id=role_id)

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

            existing_user = await conn.fetchrow("select * from user_with_roles where user_tag_id = $1", user_tag_id)
            if existing_user is not None:
                raise InvalidArgument(f"User with tag id {new_user.user_tag_pin} already exists")

        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

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
            "   created_by, customer_account_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
            node.id,
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            user_tag_id,
            creating_user_id,
            customer_account_id,
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

        return await conn.fetch_one(User, "select * from user_with_roles where id = $1", user_id)

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
    @requires_user([Privilege.create_user])
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
    @requires_terminal([Privilege.create_user], requires_event_privileges=True)
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
        user_id = await conn.fetchval("select id from user_with_roles where user_tag_uid = $1", user_tag_uid)
        if user_id is None:
            raise InvalidArgument(f"User with tag uid {format_user_tag_uid(user_tag_uid)} does not exist")

        await self.update_user_to_roles(
            conn=conn,
            node=node,
            current_user=current_user,
            user_to_roles=NewUserToRoles(user_id=user_id, role_ids=role_ids),
        )

        return await conn.fetch_one(User, "select * from user_with_roles where user_tag_uid = $1", user_tag_uid)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_users(self, *, conn: Connection, node: Node) -> list[User]:
        return await conn.fetch_many(
            User, "select * from user_with_roles where node_id = any($1) order by login", node.ids_to_root
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
        # TODO: TREE visibility
        old_password_hashed = await conn.fetchval("select password from usr where id = $1", current_user.id)
        assert old_password_hashed is not None
        if not self._check_password(old_password, old_password_hashed):
            raise AccessDenied("Invalid password")

        new_password_hashed = self._hash_password(new_password)

        await conn.execute("update usr set password = $2 where id = $1", current_user.id, new_password_hashed)

    @with_retryable_db_transaction()
    @requires_user(node_required=False)
    async def logout_user(self, *, conn: Connection, current_user: User, token: str) -> bool:
        # TODO: TREE visibility
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        assert token_payload is not None
        assert current_user.id == token_payload.user_id

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"
