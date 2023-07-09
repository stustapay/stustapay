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
    format_user_tag_uid,
)
from stustapay.core.service.auth import AuthService, UserTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_terminal,
    requires_user,
    with_db_transaction,
    DbContext,
    UserContext,
    TerminalContext,
)
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
    async def _get_user_role(ctx: DbContext, *, role_id: int) -> Optional[UserRole]:
        row = await ctx.conn.fetchrow("select * from user_role_with_privileges where id = $1", role_id)
        if row is None:
            return None

        return UserRole.parse_obj(row)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def list_user_roles(self, ctx: UserContext) -> list[UserRole]:
        return await list_user_roles(conn=ctx.conn)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def create_user_role(self, ctx: UserContext, *, new_role: NewUserRole) -> UserRole:
        role_id = await ctx.conn.fetchval(
            "insert into user_role (name, is_privileged) values ($1, $2) returning id",
            new_role.name,
            new_role.is_privileged,
        )
        for privilege in new_role.privileges:
            await ctx.conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        assert role_id is not None
        role = await self._get_user_role(ctx, role_id=role_id)
        assert role is not None
        return role

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def update_user_role_privileges(
        self, ctx: UserContext, *, role_id: int, is_privileged: bool, privileges: list[Privilege]
    ) -> UserRole:
        role = await self._get_user_role(ctx, role_id=role_id)
        if role is None:
            raise NotFound(element_typ="user_role", element_id=str(role))

        await ctx.conn.execute("update user_role set is_privileged = $2 where id = $1", role_id, is_privileged)

        await ctx.conn.execute("delete from user_role_to_privilege where role_id = $1", role_id)
        for privilege in privileges:
            await ctx.conn.execute(
                "insert into user_role_to_privilege (role_id, privilege) values ($1, $2)", role_id, privilege.name
            )

        role = await self._get_user_role(ctx, role_id=role_id)
        assert role is not None
        return role

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def delete_user_role(self, ctx: UserContext, *, role_id: int) -> bool:
        result = await ctx.conn.execute(
            "delete from user_role where id = $1",
            role_id,
        )
        return result != "DELETE 0"

    @staticmethod
    async def _update_user_roles(ctx: DbContext, *, user_id: int, role_names: list[str], delete_before_insert=False):
        if delete_before_insert:
            await ctx.conn.execute("delete from user_to_role where user_id = $1", user_id)

        for role_name in role_names:
            role_id = await ctx.conn.fetchval("select id from user_role where name = $1", role_name)
            if role_id is None:
                raise InvalidArgument(f"User role with name '{role_name}' does not exist")
            await ctx.conn.execute("insert into user_to_role (user_id, role_id) values ($1, $2)", user_id, role_id)

    async def _create_user(
        self,
        ctx: DbContext,
        *,
        new_user: UserWithoutId,
        creating_user_id: Optional[int],
        password: Optional[str] = None,
    ) -> User:
        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

        customer_account_id = None
        if new_user.user_tag_uid is not None:
            customer_account_id = await ctx.conn.fetchval(
                "select id from account a where a.user_tag_uid = $1", new_user.user_tag_uid
            )

        if customer_account_id is None:
            customer_account_id = await ctx.conn.fetchval(
                "insert into account (user_tag_uid, type) values ($1, 'private') returning id", new_user.user_tag_uid
            )

        user_id = await ctx.conn.fetchval(
            "insert into usr (login, description, password, display_name, user_tag_uid, transport_account_id, "
            "   cashier_account_id, created_by, customer_account_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id",
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            new_user.user_tag_uid,
            new_user.transport_account_id,
            new_user.cashier_account_id,
            creating_user_id,
            customer_account_id,
        )

        await self._update_user_roles(ctx, user_id=user_id, role_names=new_user.role_names)

        row = await ctx.conn.fetchrow("select * from user_with_roles where id = $1", user_id)
        return User.parse_obj(row)

    @with_db_transaction
    async def create_user_no_auth(
        self,
        ctx: DbContext,
        *,
        new_user: UserWithoutId,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(ctx, creating_user_id=None, new_user=new_user, password=password)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def create_user(
        self,
        ctx: UserContext,
        *,
        new_user: UserWithoutId,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(ctx, creating_user_id=ctx.current_user.id, new_user=new_user, password=password)

    @staticmethod
    async def _contains_privileged_roles(ctx: DbContext, *, role_names: list[str]) -> bool:
        res = await ctx.conn.fetchval(
            "select true from user_role where name = any($1::text array) and is_privileged", role_names
        )
        return res is not None

    @requires_terminal([Privilege.user_management])
    @with_db_transaction
    async def create_user_terminal(self, ctx: TerminalContext, *, new_user: NewUser) -> User:
        if await self._contains_privileged_roles(ctx, role_names=new_user.role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        return await self._create_user_with_tag(ctx, creating_user_id=ctx.current_user.id, new_user=new_user)

    @requires_terminal([Privilege.user_management])
    @with_db_transaction
    async def update_user_roles_terminal(self, ctx: TerminalContext, user_tag_uid: int, role_names: list[str]) -> User:
        if await self._contains_privileged_roles(ctx, role_names=role_names):
            raise AccessDenied("Cannot promote users to privileged roles on a terminal")

        user_id = await ctx.conn.fetchval("select id from usr where user_tag_uid = $1", user_tag_uid)
        if user_id is None:
            raise InvalidArgument(f"User with tag {user_tag_uid:X} not found")

        await self._update_user_roles(ctx, user_id=user_id, role_names=role_names, delete_before_insert=True)

        return await self._get_user(ctx, user_id=user_id)

    async def _create_user_with_tag(self, ctx: DbContext, *, creating_user_id: int, new_user: NewUser) -> User:
        user_tag_uid = await ctx.conn.fetchval("select uid from user_tag where uid = $1", new_user.user_tag_uid)
        if user_tag_uid is None:
            raise NotFound(element_typ="user_tag", element_id=str(new_user.user_tag_uid))

        existing_user = await ctx.conn.fetchrow("select * from user_with_roles where user_tag_uid = $1", user_tag_uid)
        if existing_user is not None:
            raise InvalidArgument(f"User with tag uid {format_user_tag_uid(new_user.user_tag_uid)} already exists")

        user = UserWithoutId(
            login=new_user.login,
            role_names=new_user.role_names,
            user_tag_uid=user_tag_uid,
            display_name=new_user.display_name,
            description=new_user.description,
        )
        return await self._create_user(ctx, creating_user_id=creating_user_id, new_user=user)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def create_user_with_tag(self, ctx: UserContext, new_user: NewUser) -> User:
        return await self._create_user_with_tag(ctx, creating_user_id=ctx.current_user.id, new_user=new_user)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def promote_to_cashier(self, ctx: UserContext, user_id: int) -> User:
        user = await self._get_user(ctx, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if CASHIER_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(CASHIER_ROLE_NAME)
        return await self._update_user(ctx, user_id=user.id, user=user)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def promote_to_finanzorga(self, ctx: UserContext, user_id: int) -> User:
        user = await self._get_user(ctx, user_id=user_id)
        if user is None:
            raise NotFound(element_typ="user", element_id=str(user_id))

        if FINANZORGA_ROLE_NAME in user.role_names:
            return user

        user.role_names.append(FINANZORGA_ROLE_NAME)
        return await self._update_user(ctx, user_id=user.id, user=user)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def list_users(self, ctx: UserContext) -> list[User]:
        cursor = ctx.conn.cursor("select * from user_with_roles")
        result = []
        async for row in cursor:
            result.append(User.parse_obj(row))
        return result

    @staticmethod
    async def _get_user(ctx: DbContext, *, user_id: int) -> User:
        row = await ctx.conn.fetchrow("select * from user_with_roles where id = $1", user_id)
        if row is None:
            raise NotFound(element_typ="user", element_id=str(user_id))
        return User.parse_obj(row)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def get_user(self, ctx: UserContext, *, user_id: int) -> Optional[User]:
        return await self._get_user(ctx, user_id=user_id)

    async def _update_user(self, ctx: DbContext, user_id: int, user: UserWithoutId) -> User:
        row = await ctx.conn.fetchrow(
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

        await self._update_user_roles(ctx, user_id=user_id, role_names=user.role_names, delete_before_insert=True)

        return await self._get_user(ctx, user_id=user_id)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def update_user_roles(self, ctx: UserContext, user_id: int, role_names: list[str]) -> Optional[User]:
        found = await ctx.conn.fetchval("select true from usr where id = $1", user_id)
        if not found:
            raise NotFound(element_typ="user", element_id=str(user_id))

        await self._update_user_roles(ctx, user_id=user_id, role_names=role_names, delete_before_insert=True)
        return await self._get_user(ctx, user_id=user_id)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def update_user(self, ctx: UserContext, user_id: int, user: UserWithoutId) -> Optional[User]:
        return await self._update_user(ctx, user_id=user_id, user=user)

    @requires_user([Privilege.user_management])
    @with_db_transaction
    async def delete_user(self, ctx: UserContext, user_id: int) -> bool:
        result = await ctx.conn.execute(
            "delete from usr where id = $1",
            user_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    async def login_user(self, ctx: DbContext, username: str, password: str) -> UserLoginSuccess:
        row = await ctx.conn.fetchrow(
            "select * from usr where login = $1",
            username,
        )
        if row is None:
            raise AccessDenied("Invalid username or password")

        user_id = row["id"]
        if not self._check_password(password, row["password"]):
            raise AccessDenied("Invalid username or password")

        session_id = await ctx.conn.fetchval("insert into usr_session (usr) values ($1) returning id", user_id)
        token = self.auth_service.create_user_access_token(UserTokenMetadata(user_id=user_id, session_id=session_id))
        user = await self.auth_service.get_user_from_token(ctx, token=token)
        assert user is not None
        return UserLoginSuccess(
            user=user,
            token=token,
        )

    @requires_user()
    @with_db_transaction
    async def change_password(self, ctx: UserContext, old_password: str, new_password: str):
        old_password_hashed = await ctx.conn.fetchval("select password from usr where id = $1", ctx.current_user.id)
        assert old_password_hashed is not None
        if not self._check_password(old_password, old_password_hashed):
            raise AccessDenied("Invalid password")

        new_password_hashed = self._hash_password(new_password)

        await ctx.conn.execute("update usr set password = $2 where id = $1", ctx.current_user.id, new_password_hashed)

    @requires_user()
    @with_db_transaction
    async def logout_user(self, ctx: UserContext, current_user: User, token: str) -> bool:
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        assert token_payload is not None
        assert current_user.id == token_payload.user_id

        result = await ctx.conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"
