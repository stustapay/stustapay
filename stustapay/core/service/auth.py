import uuid
from typing import Optional

import asyncpg
from jose import JWTError, jwt
from pydantic import BaseModel, ValidationError

from stustapay.core.schema.customer import Customer
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.till import Till
from stustapay.core.schema.user import CurrentUser
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction


class UserTokenMetadata(BaseModel):
    user_id: int
    session_id: int


class CustomerTokenMetadata(BaseModel):
    customer_id: int
    session_id: int


class TerminalTokenMetadata(BaseModel):
    till_id: int
    session_uuid: uuid.UUID


class AuthService(DBService):
    """
    Extra service to check login tokens
    It is needed in every service with uses `requires_user_privileges` or `requires_terminal`
    """

    def decode_user_jwt_payload(self, token: str) -> Optional[UserTokenMetadata]:
        try:
            payload = jwt.decode(token, self.cfg.core.secret_key, algorithms=[self.cfg.core.jwt_token_algorithm])
            try:
                return UserTokenMetadata.parse_obj(payload)
            except ValidationError:
                return None
        except JWTError:
            return None

    def create_user_access_token(self, token_metadata: UserTokenMetadata) -> str:
        to_encode = {"user_id": token_metadata.user_id, "session_id": token_metadata.session_id}
        encoded_jwt = jwt.encode(to_encode, self.cfg.core.secret_key, algorithm=self.cfg.core.jwt_token_algorithm)
        return encoded_jwt

    def decode_customer_jwt_payload(self, token: str) -> Optional[CustomerTokenMetadata]:
        try:
            payload = jwt.decode(token, self.cfg.core.secret_key, algorithms=[self.cfg.core.jwt_token_algorithm])
            try:
                return CustomerTokenMetadata.parse_obj(payload)
            except ValidationError:
                return None
        except JWTError:
            return None

    def create_customer_access_token(self, token_metadata: CustomerTokenMetadata) -> str:
        to_encode = {"customer_id": token_metadata.customer_id, "session_id": token_metadata.session_id}
        encoded_jwt = jwt.encode(to_encode, self.cfg.core.secret_key, algorithm=self.cfg.core.jwt_token_algorithm)
        return encoded_jwt

    @with_db_transaction
    async def get_user_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[CurrentUser]:
        token_payload = self.decode_user_jwt_payload(token)
        if token_payload is None:
            return None

        row = await conn.fetchrow(
            "select u.*, null as active_role_id "
            "from user_with_privileges u join usr_session s on u.id = s.usr "
            "where u.id = $1 and s.id = $2",
            token_payload.user_id,
            token_payload.session_id,
        )
        if row is None:
            return None

        return CurrentUser.parse_obj(row)

    @with_db_transaction
    async def get_customer_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[Customer]:
        token_payload = self.decode_customer_jwt_payload(token)
        if token_payload is None:
            return None

        row = await conn.fetchrow(
            "select a.*, s.id as session_id "
            "from account a join customer_session s on a.id = s.customer "
            "where a.id = $1 and s.id = $2",
            token_payload.customer_id,
            token_payload.session_id,
        )
        if row is None:
            return None

        return Customer.parse_obj(row)

    def decode_terminal_jwt_payload(self, token: str) -> Optional[TerminalTokenMetadata]:
        try:
            payload = jwt.decode(token, self.cfg.core.secret_key, algorithms=[self.cfg.core.jwt_token_algorithm])
            try:
                return TerminalTokenMetadata.parse_obj(payload)
            except ValidationError:
                return None
        except JWTError:
            return None

    def create_terminal_access_token(self, token_metadata: TerminalTokenMetadata):
        to_encode = {"till_id": token_metadata.till_id, "session_uuid": str(token_metadata.session_uuid)}
        encoded_jwt = jwt.encode(to_encode, self.cfg.core.secret_key, algorithm=self.cfg.core.jwt_token_algorithm)
        return encoded_jwt

    @with_db_transaction
    async def get_terminal_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[Terminal]:
        token_payload = self.decode_terminal_jwt_payload(token)
        if token_payload is None:
            return None

        row = await conn.fetchrow(
            "select * from till where id = $1 and session_uuid = $2",
            token_payload.till_id,
            token_payload.session_uuid,
        )
        if row is None:
            return None

        return Terminal(till=Till.parse_obj(row))
