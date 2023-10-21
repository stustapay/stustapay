# pylint: disable=unexpected-keyword-arg
from typing import Optional

import asyncpg
from passlib.context import CryptContext
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import (
    CASHIER_ROLE_NAME,
    FINANZORGA_ROLE_NAME,
    CurrentUser,
    NewUser,
    NewUserRole,
    Privilege,
    User,
    UserRole,
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
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument, NotFound
from stustapay.core.service.tree.common import fetch_node
from stustapay.framework.database import Connection


class UserLoginSuccess(BaseModel):
    user: CurrentUser
    token: str


async def list_user_roles(*, conn: Connection, node: Node) -> list[UserRole]:
    return await conn.fetch_many(
        UserRole, "select * from user_role_with_privileges where node_id = any($1)", node.ids_to_root
    )


async def _get_user_role(*, conn: Connection, role_id: int) -> Optional[UserRole]:
    return await conn.fetch_maybe_one(UserRole, "select * from user_role_with_privileges where id = $1", role_id)


class UserService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def list_user_roles(self, *, conn: Connection, node: Node) -> list[UserRole]:
        return await list_user_roles(conn=conn, node=node)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def create_user_role(self, *, conn: Connection, node: Node, new_role: NewUserRole) -> UserRole:
        # TODO: TREE visibility
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
    @requires_user([Privilege.user_management])
    @requires_node()
    async def update_user_role_privileges(
        self, *, conn: Connection, role_id: int, is_privileged: bool, privileges: list[Privilege]
    ) -> UserRole:
        # TODO: TREE visibility
        role = await _get_user_role(conn=conn, role_id=role_id)
        if role is None:
            raise NotFound(element_typ="user_role", element_id=str(role))

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
    @requires_user([Privilege.user_management])
    @requires_node()
    async def delete_user_role(self, *, conn: Connection, role_id: int) -> bool:
        # TODO: TREE visibility
        result = await conn.execute(
            "delete from user_role where id = $1",
            role_id,
        )
        return result != "DELETE 0"

    @staticmethod
    async def _update_user_roles(*, conn: Connection, user_id: int, role_names: list[str], delete_before_insert=False):
        # TODO: TREE visibility
        if delete_before_insert:
            await conn.execute("delete from user_to_role where user_id = $1", user_id)

        for role_name in role_names:
            # TODO: NODE_ID incorporate node_id
            role_id = await conn.fetchval("select id from user_role where name = $1", role_name)
            if role_id is None:
                raise InvalidArgument(f"User role with name '{role_name}' does not exist")
            await conn.execute("insert into user_to_role (user_id, role_id) values ($1, $2)", user_id, role_id)

    async def _create_user(
        self,
        *,
        conn: Connection,
        node_id: int,
        new_user: NewUser,
        creating_user_id: Optional[int],
        password: Optional[str] = None,
    ) -> User:
        # TODO: TREE visibility
        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

        customer_account_id = None
        if new_user.user_tag_uid is not None:
            customer_account_id = await conn.fetchval(
                "select id from account a where a.user_tag_uid = $1", new_user.user_tag_uid
            )

        if customer_account_id is None:
            # TODO: NODE_ID determine node id
            customer_account_id = await conn.fetchval(
                "insert into account (node_id, user_tag_uid, type) values ($1, $2, 'private') returning id",
                node_id,
                new_user.user_tag_uid,
            )

        user_id = await conn.fetchval(
            "insert into usr (node_id, login, description, password, display_name, user_tag_uid, "
            "   created_by, customer_account_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
            node_id,
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            new_user.user_tag_uid,
            creating_user_id,
            customer_account_id,
        )

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=new_user.role_names)

        return await conn.fetch_one(User, "select * from user_with_roles where id = $1", user_id)

    @with_db_transaction
    async def create_user_no_auth(
        self,
        *,
        conn: Connection,
        node_id: int,
        new_user: NewUser,
        password: Optional[str] = None,
    ) -> User:
        # TODO: TREE visibility
        return await self._create_user(
            conn=conn, creating_user_id=None, node_id=node_id, new_user=new_user, password=password
        )

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def create_user(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_user: NewUser,
        password: Optional[str] = None,
    ) -> User:
        # TODO: TREE visibility
        return await self._create_user(
            conn=conn, creating_user_id=current_user.id, node_id=node.id, new_user=new_user, password=password
        )

    @staticmethod
    async def _contains_privileged_roles(conn: Connection, role_names: list[str]) -> bool:
        res = await conn.fetchval(
            "select true from user_role where name = any($1::text array) and is_privileged", role_names
        )
        return res is not None

    @with_db_transaction
    @requires_terminal([Privilege.user_management])
    async def create_user_terminal(self, *, conn: Connection, current_user: CurrentUser, new_user: NewUser) -> User:
        # TODO: TREE visibility
        if await self._contains_privileged_roles(conn=conn, role_names=new_user.role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        return await self.create_user_with_tag(  # pylint: disable=missing-kwoa
            conn=conn, current_user=current_user, new_user=new_user
        )

    @with_db_transaction
    @requires_terminal([Privilege.user_management])
    async def update_user_roles_terminal(
        self, *, conn: Connection, current_terminal: Terminal, user_tag_uid: int, role_names: list[str]
    ) -> User:
        # TODO: TREE visibility
        if await self._contains_privileged_roles(conn=conn, role_names=role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        node = await fetch_node(conn=conn, node_id=current_terminal.till.node_id)
        assert node is not None

        user_id = await conn.fetchval("select id from usr where user_tag_uid = $1", user_tag_uid)
        if user_id is None:
            raise InvalidArgument(f"User with tag {user_tag_uid:X} not found")

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=role_names, delete_before_insert=True)

        return await self._get_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def create_user_with_tag(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, new_user: NewUser
    ) -> User:
        # TODO: TREE visibility
        """
        Create a user at a Terminal, where a name and the user tag must be provided
        If a user with the given tag already exists, this user is returned, without updating the name

        returns the created user
        """
        user_tag_uid = await conn.fetchval("select uid from user_tag where uid = $1", new_user.user_tag_uid)
        if user_tag_uid is None:
            raise InvalidArgument(f"Tag uid {format_user_tag_uid(new_user.user_tag_uid)} not found")

        existing_user = await conn.fetchrow("select * from user_with_roles where user_tag_uid = $1", user_tag_uid)
        if existing_user is not None:
            raise InvalidArgument(f"User with tag uid {format_user_tag_uid(new_user.user_tag_uid)} already exists")

        user = NewUser(
            login=new_user.login,
            role_names=new_user.role_names,
            user_tag_uid=user_tag_uid,
            display_name=new_user.display_name,
            description=new_user.description,
        )
        return await self._create_user(conn=conn, node_id=node.id, creating_user_id=current_user.id, new_user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def promote_to_cashier(self, *, conn: Connection, node: Node, user_id: int) -> User:
        # TODO: TREE visibility
        user = await self._get_user(conn=conn, node=node, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if CASHIER_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(CASHIER_ROLE_NAME)
        return await self._update_user(conn=conn, node=node, user_id=user.id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def promote_to_finanzorga(self, *, conn: Connection, node: Node, user_id: int) -> User:
        # TODO: TREE visibility
        user = await self._get_user(conn=conn, node=node, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if FINANZORGA_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(FINANZORGA_ROLE_NAME)
        return await self._update_user(conn=conn, node=node, user_id=user.id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def list_users(self, *, conn: Connection, node: Node) -> list[User]:
        return await conn.fetch_many(User, "select * from user_with_roles where node_id = any($1)", node.ids_to_root)

    @staticmethod
    async def _get_user(*, conn: Connection, node: Node, user_id: int) -> User:
        # TODO: TREE visibility
        user = await conn.fetch_maybe_one(
            User, "select * from user_with_roles where id = $1 and node_id = any($2)", user_id, node.ids_to_root
        )
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))
        return user

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def get_user(self, *, conn: Connection, node: Node, user_id: int) -> Optional[User]:
        return await self._get_user(conn=conn, node=node, user_id=user_id)

    async def _update_user(self, *, conn: Connection, node: Node, user_id: int, user: NewUser) -> User:
        row = await conn.fetchrow(
            "update usr "
            "set login = $2, description = $3, display_name = $4, user_tag_uid = $5 "
            "where id = $1 returning id",
            user_id,
            user.login,
            user.description,
            user.display_name,
            user.user_tag_uid,
        )
        if row is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=user.role_names, delete_before_insert=True)

        return await self._get_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def update_user_roles(
        self, *, conn: Connection, node: Node, user_id: int, role_names: list[str]
    ) -> Optional[User]:
        # TODO: TREE visibility
        found = await conn.fetchval("select true from usr where id = $1", user_id)
        if not found:
            raise NotFound(element_typ="user", element_id=str(user_id))

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=role_names, delete_before_insert=True)
        return await self._get_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def update_user(self, *, conn: Connection, node: Node, user_id: int, user: UserWithoutId) -> Optional[User]:
        # TODO: TREE visibility
        return await self._update_user(conn=conn, node=node, user_id=user_id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    @requires_node()
    async def delete_user(self, *, conn: Connection, user_id: int) -> bool:
        # TODO: TREE visibility
        result = await conn.execute(
            "delete from usr where id = $1",
            user_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    async def login_user(self, *, conn: Connection, username: str, password: str) -> UserLoginSuccess:
        # TODO: TREE visibility
        row = await conn.fetchrow(
            "select * from usr where login = $1",
            username,
        )
        if row is None:
            raise AccessDenied("Invalid username or password")

        user_id = row["id"]
        if not self._check_password(password, row["password"]):
            raise AccessDenied("Invalid username or password")

        session_id = await conn.fetchval("insert into usr_session (usr) values ($1) returning id", user_id)
        token = self.auth_service.create_user_access_token(UserTokenMetadata(user_id=user_id, session_id=session_id))
        user = await self.auth_service.get_user_from_token(conn=conn, token=token)
        return UserLoginSuccess(
            user=user,
            token=token,
        )

    @with_db_transaction
    @requires_user()
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

    @with_db_transaction
    @requires_user()
    async def logout_user(self, *, conn: Connection, current_user: User, token: str) -> bool:
        # TODO: TREE visibility
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        assert token_payload is not None
        assert current_user.id == token_payload.user_id

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"
