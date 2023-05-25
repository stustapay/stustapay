# pylint: disable=unexpected-keyword-arg
from typing import Optional

import asyncpg
from passlib.context import CryptContext
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.user import (
    NewUser,
    Privilege,
    User,
    UserWithoutId,
    FINANZORGA_ROLE_NAME,
    CASHIER_ROLE_NAME,
    UserRole,
    NewUserRole,
    CurrentUser,
)
from stustapay.core.service.auth import AuthService, UserTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_terminal, requires_user, with_db_transaction
from stustapay.core.service.common.error import NotFound, InvalidArgument, AccessDenied


class UserLoginSuccess(BaseModel):
    user: CurrentUser
    token: str


async def list_user_roles(*, conn: asyncpg.Connection) -> list[UserRole]:
    rows = await conn.fetch("select * from user_role_with_privileges")
    return [UserRole.parse_obj(row) for row in rows]


class UserService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

    @staticmethod
    async def _get_user_role(*, conn: asyncpg.Connection, role_id: int) -> Optional[UserRole]:
        row = await conn.fetchrow("select * from user_role_with_privileges where id = $1", role_id)
        if row is None:
            return None

        return UserRole.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def list_user_roles(self, *, conn: asyncpg.Connection) -> list[UserRole]:
        return await list_user_roles(conn=conn)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def create_user_role(self, *, conn: asyncpg.Connection, new_role: NewUserRole) -> UserRole:
        role_id = await conn.fetchval("insert into user_role (name) values ($1) returning id", new_role.name)
        for privilege in new_role.privileges:
            await conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        assert role_id is not None
        role = await self._get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        return role

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def update_user_role_privileges(
        self, *, conn: asyncpg.Connection, role_id: int, privileges: list[Privilege]
    ) -> UserRole:
        role = await self._get_user_role(conn=conn, role_id=role_id)
        if role is None:
            raise NotFound(element_typ="user_role", element_id=str(role))

        await conn.execute("delete from user_role_to_privilege where role_id = $1", role_id)
        for privilege in privileges:
            await conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        role = await self._get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        return role

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def delete_user_role(self, *, conn: asyncpg.Connection, role_id: int) -> bool:
        result = await conn.execute(
            "delete from user_role where id = $1",
            role_id,
        )
        return result != "DELETE 0"

    @staticmethod
    async def _update_user_roles(
        *, conn: asyncpg.Connection, user_id: int, role_names: list[str], delete_before_insert=False
    ):
        if delete_before_insert:
            await conn.execute("delete from user_to_role where user_id = $1", user_id)

        for role_name in role_names:
            role_id = await conn.fetchval("select id from user_role where name = $1", role_name)
            if role_id is None:
                raise InvalidArgument(f"User role with name '{role_name}' does not exist")
            await conn.execute("insert into user_to_role (user_id, role_id) values ($1, $2)", user_id, role_id)

    async def _create_user(
        self,
        *,
        conn: asyncpg.Connection,
        new_user: UserWithoutId,
        creating_user_id: Optional[int],
        password: Optional[str] = None,
    ) -> User:
        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

        user_id = await conn.fetchval(
            "insert into usr (login, description, password, display_name, user_tag_uid, transport_account_id, "
            "   cashier_account_id, created_by) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            new_user.user_tag_uid,
            new_user.transport_account_id,
            new_user.cashier_account_id,
            creating_user_id,
        )

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=new_user.role_names)

        row = await conn.fetchrow("select * from user_with_roles where id = $1", user_id)
        return User.parse_obj(row)

    @with_db_transaction
    async def create_user_no_auth(
        self,
        *,
        conn: asyncpg.Connection,
        new_user: UserWithoutId,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(conn=conn, creating_user_id=None, new_user=new_user, password=password)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def create_user(
        self,
        *,
        conn: asyncpg.Connection,
        current_user: CurrentUser,
        new_user: UserWithoutId,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(
            conn=conn, creating_user_id=current_user.id, new_user=new_user, password=password
        )

    @staticmethod
    async def _contains_privileged_roles(conn: asyncpg.Connection, role_names: list[str]) -> bool:
        res = await conn.fetchval(
            "select true from user_role where name = any($1::text array) and is_privileged", role_names
        )
        return res is not None

    @with_db_transaction
    @requires_terminal([Privilege.user_management])
    async def create_user_terminal(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, new_user: NewUser
    ) -> User:
        if await self._contains_privileged_roles(conn=conn, role_names=new_user.role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        return await self.create_user_with_tag(conn=conn, current_user=current_user, new_user=new_user)

    @with_db_transaction
    @requires_terminal([Privilege.user_management])
    async def update_user_roles_terminal(
        self, *, conn: asyncpg.Connection, user_tag_uid: int, role_names: list[str]
    ) -> User:
        if await self._contains_privileged_roles(conn=conn, role_names=role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        user_id = await conn.fetchval("select id from usr where user_tag_uid = $1", user_tag_uid)
        if user_id is None:
            raise InvalidArgument(f"User with tag {user_tag_uid} not found")

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=role_names, delete_before_insert=True)

        return await self._get_user(conn=conn, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def create_user_with_tag(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, new_user: NewUser
    ) -> User:
        """
        Create a user at a Terminal, where a name and the user tag must be provided
        If a user with the given tag already exists, this user is returned, without updating the name

        returns the created user
        """
        user_tag_uid = await conn.fetchval("select uid from user_tag where uid = $1", new_user.user_tag_uid)
        if user_tag_uid is None:
            raise NotFound(element_typ="user_tag", element_id=str(new_user.user_tag_uid))

        existing_user = await conn.fetchrow("select * from user_with_roles where user_tag_uid = $1", user_tag_uid)
        if existing_user is not None:
            # ignore the name provided in new_user
            return User.parse_obj(existing_user)

        user = UserWithoutId(
            login=new_user.login,
            role_names=new_user.role_names,
            user_tag_uid=user_tag_uid,
            display_name=new_user.display_name,
        )
        return await self._create_user(conn=conn, current_user=current_user, new_user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def promote_to_cashier(self, *, conn: asyncpg.Connection, user_id: int) -> User:
        user = await self._get_user(conn=conn, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if CASHIER_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(CASHIER_ROLE_NAME)
        return await self._update_user(conn=conn, user_id=user.id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def promote_to_finanzorga(self, *, conn: asyncpg.Connection, user_id: int) -> User:
        user = await self._get_user(conn=conn, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if FINANZORGA_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(FINANZORGA_ROLE_NAME)
        return await self._update_user(conn=conn, user_id=user.id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def list_users(self, *, conn: asyncpg.Connection) -> list[User]:
        cursor = conn.cursor("select * from user_with_roles")
        result = []
        async for row in cursor:
            result.append(User.parse_obj(row))
        return result

    @staticmethod
    async def _get_user(*, conn: asyncpg.Connection, user_id: int) -> User:
        row = await conn.fetchrow("select * from user_with_roles where id = $1", user_id)
        if row is None:
            raise NotFound(element_typ="user", element_id=str(user_id))
        return User.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def get_user(self, *, conn: asyncpg.Connection, user_id: int) -> Optional[User]:
        return await self._get_user(conn=conn, user_id=user_id)

    async def _update_user(self, *, conn: asyncpg.Connection, user_id: int, user: UserWithoutId) -> User:
        row = await conn.fetchrow(
            "update usr "
            "set login = $2, description = $3, display_name = $4, user_tag_uid = $5, transport_account_id = $6, "
            "   cashier_account_id = $7 "
            "where id = $1 returning id",
            user_id,
            user.login,
            user.description,
            user.display_name,
            user.user_tag_uid,
            user.transport_account_id,
            user.cashier_account_id,
        )
        if row is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=user.role_names, delete_before_insert=True)

        return await self._get_user(conn=conn, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def update_user_roles(
        self, *, conn: asyncpg.Connection, user_id: int, role_names: list[str]
    ) -> Optional[User]:
        found = await conn.fetchval("select true from usr where id = $1", user_id)
        if not found:
            raise NotFound(element_typ="user", element_id=str(user_id))

        await self._update_user_roles(conn=conn, user_id=user_id, role_names=role_names, delete_before_insert=True)
        return await self._get_user(conn=conn, user_id=user_id)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def update_user(self, *, conn: asyncpg.Connection, user_id: int, user: UserWithoutId) -> Optional[User]:
        return await self._update_user(conn=conn, user_id=user_id, user=user)

    @with_db_transaction
    @requires_user([Privilege.user_management])
    async def delete_user(self, *, conn: asyncpg.Connection, user_id: int) -> bool:
        result = await conn.execute(
            "delete from usr where id = $1",
            user_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    async def login_user(self, *, conn: asyncpg.Connection, username: str, password: str) -> Optional[UserLoginSuccess]:
        row = await conn.fetchrow(
            "select * from usr where login = $1",
            username,
        )
        if row is None:
            return None

        user_id = row["id"]
        if not self._check_password(password, row["password"]):
            return None

        session_id = await conn.fetchval("insert into usr_session (usr) values ($1) returning id", user_id)
        token = self.auth_service.create_user_access_token(UserTokenMetadata(user_id=user_id, session_id=session_id))
        user = await self.auth_service.get_user_from_token(conn=conn, token=token)
        return UserLoginSuccess(
            user=user,
            token=token,
        )

    @with_db_transaction
    @requires_user()
    async def logout_user(self, *, conn: asyncpg.Connection, current_user: User, token: str) -> bool:
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        if token_payload is None:
            return False

        if current_user.id != token_payload.user_id:
            return False

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"
