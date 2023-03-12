from typing import Optional

import asyncpg
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ValidationError

from .dbservice import DBService, requires_user_privileges, with_db_transaction
from ..config import Config
from ..schema.user import Privilege, User, UserWithoutId


class TokenMetadata(BaseModel):
    user_id: int
    session_id: int


class UserLoginSuccess(BaseModel):
    user: User
    token: str


class UserService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config):
        super().__init__(db_pool, config)

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

    async def _create_user(
        self, *, conn: asyncpg.Connection, new_user: UserWithoutId, password: Optional[str] = None
    ) -> User:
        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

        user_id = await conn.fetchval(
            "insert into usr (name, description, password, user_tag_id) values ($1, $2, $3, $4) returning id",
            new_user.name,
            new_user.description,
            hashed_password,
            new_user.user_tag,
        )

        for privilege in new_user.privileges:
            await conn.execute("insert into usr_privs (usr, priv) values ($1, $2)", user_id, privilege.value)

        row = await conn.fetchrow("select * from usr_with_privileges where id = $1", user_id)
        return User.parse_obj(row)

    @with_db_transaction
    async def create_user_no_auth(
        self, *, conn: asyncpg.Connection, new_user: UserWithoutId, password: Optional[str] = None
    ) -> User:
        return await self._create_user(conn=conn, new_user=new_user, password=password)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_user(
        self, *, conn: asyncpg.Connection, new_user: UserWithoutId, password: Optional[str] = None
    ) -> User:
        return await self._create_user(conn=conn, new_user=new_user, password=password)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_users(self, *, conn: asyncpg.Connection) -> list[User]:
        cursor = conn.cursor("select * from usr_with_privileges")
        result = []
        async for row in cursor:
            result.append(User.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_user(self, *, conn: asyncpg.Connection, user_id: int) -> Optional[User]:
        row = await conn.fetchrow(
            "select * from usr_with_privileges where id = $1",
            user_id,
        )
        if row is None:
            return None

        return User.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_user(self, *, conn: asyncpg.Connection, user_id: int, user: UserWithoutId) -> Optional[User]:
        row = await conn.fetchrow(
            "update usr set name = $2, description = $3 where id = $1 returning id, name, description",
            user_id,
            user.name,
            user.description,
        )
        if row is None:
            return None

        return User.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_user(self, *, conn: asyncpg.Connection, user_id: int) -> bool:
        result = await conn.execute(
            "delete from usr where id = $1",
            user_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def link_user_to_cashier_account(self, *, conn: asyncpg.Connection, user_id: int, account_id: int) -> bool:
        # TODO: FIXME: is this the way it's going to stay?
        result = await conn.fetchval(
            "update usr set cashier_account_id = $2 where id = $1 returning id",
            user_id,
            account_id,
        )
        return result is not None

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def link_user_to_transport_account(self, *, conn: asyncpg.Connection, user_id: int, account_id: int) -> bool:
        # TODO: FIXME: is this the way it's going to stay?
        result = await conn.fetchval(
            "update usr set transport_account_id = $2 where id = $1 returning id",
            user_id,
            account_id,
        )
        return result is not None

    @with_db_transaction
    async def login_user(self, *, conn: asyncpg.Connection, username: str, password: str) -> Optional[UserLoginSuccess]:
        row = await conn.fetchrow(
            "select * from usr_with_privileges where name = $1",
            username,
        )
        if row is None:
            return None

        if not self._check_password(password, row["password"]):
            return None

        user = User.parse_obj(row)

        session_id = await conn.fetchval("insert into usr_session (usr) values ($1) returning id", user.id)
        token = self._create_access_token(user_id=user.id, session_id=session_id)
        return UserLoginSuccess(
            user=user,
            token=token,
        )

    @with_db_transaction
    async def logout_user(self, *, conn: asyncpg.Connection, current_user: User, token: str) -> bool:
        token_payload = self._decode_jwt_payload(token)
        if token_payload is None:
            return False

        if current_user.id != token_payload.user_id:
            return False

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"

    @with_db_transaction
    async def get_user_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[User]:
        token_payload = self._decode_jwt_payload(token)
        if token_payload is None:
            return None

        row = await conn.fetchrow(
            "select u.*, s.id as session_id "
            "from usr_with_privileges u join usr_session s on u.id = s.usr "
            "where u.id = $1 and s.id = $2",
            token_payload.user_id,
            token_payload.session_id,
        )
        if row is None:
            return None

        return User.parse_obj(row)

    def _create_access_token(self, user_id: int, session_id: int):
        to_encode = {"user_id": user_id, "session_id": session_id}
        encoded_jwt = jwt.encode(to_encode, self.cfg.core.secret_key, algorithm=self.cfg.core.jwt_token_algorithm)
        return encoded_jwt

    def _decode_jwt_payload(self, token: str) -> Optional[TokenMetadata]:
        try:
            payload = jwt.decode(token, self.cfg.core.secret_key, algorithms=[self.cfg.core.jwt_token_algorithm])
            try:
                return TokenMetadata.parse_obj(payload)
            except ValidationError:
                return None
        except JWTError:
            return None
