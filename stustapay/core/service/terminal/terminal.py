import uuid
from typing import Optional

import asyncpg
from jose import JWTError, jwt
from pydantic import BaseModel, ValidationError

from stustapay.core.config import Config
from stustapay.core.schema.terminal import Terminal, NewTerminal
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges, requires_terminal
from stustapay.core.service.terminal.layout import TerminalLayoutService
from stustapay.core.service.terminal.profile import TerminalProfileService


class TokenMetadata(BaseModel):
    terminal_id: int
    session_uuid: int


class TerminalRegistrationSuccess(BaseModel):
    terminal: Terminal
    token: str


class TerminalService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config):
        super().__init__(db_pool, config)

        self.profile = TerminalProfileService(db_pool, config)
        self.layout = TerminalLayoutService(db_pool, config)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_terminal(self, *, conn: asyncpg.Connection, terminal: NewTerminal) -> Terminal:
        row = await conn.fetchrow(
            "insert into terminal (name, description, registration_uuid, tse_id, active_shift, active_profile_id, active_cashier_id) "
            "values ($1, $2, $3, $4, $5, $6, $7) returning id, name, description, registration_uuid, session_uuid, "
            "tse_id, active_shift, active_profile_id, active_cashier_id",
            terminal.name,
            terminal.description,
            uuid.uuid4(),
            terminal.tse_id,
            terminal.active_shift,
            terminal.active_profile_id,
            terminal.active_cashier_id,
        )

        return Terminal.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_terminals(self, *, conn: asyncpg.Connection) -> list[Terminal]:
        cursor = conn.cursor("select * from terminal")
        result = []
        async for row in cursor:
            result.append(Terminal.from_db(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_terminal(self, *, conn: asyncpg.Connection, terminal_id: str) -> Optional[Terminal]:
        row = await conn.fetchrow("select * from terminal where id = $1", terminal_id)
        if row is None:
            return None

        return Terminal.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_terminal(
        self, *, conn: asyncpg.Connection, terminal_id: str, terminal: NewTerminal
    ) -> Optional[Terminal]:
        row = await conn.fetchrow(
            "update terminal set name = $2, description = $3, tse_id = $4, active_shift = $5, active_profile_id = $6, active_cashier_id = $7 "
            "where id = $1 returning id, name, description, registration_uuid, tse_id, active_shift, active_profile_id, session_uuid, active_cashier_id",
            terminal_id,
            terminal.name,
            terminal.description,
            terminal.tse_id,
            terminal.active_shift,
            terminal.active_profile_id,
            terminal.active_cashier_id,
        )
        if row is None:
            return None

        return Terminal.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_terminal(self, *, conn: asyncpg.Connection, terminal_id: int) -> bool:
        result = await conn.execute(
            "delete from terminal where id = $1",
            terminal_id,
        )
        return result != "DELETE 0"

    def _create_access_token(self, terminal_id: int, session_uuid: uuid.UUID):
        to_encode = {"terminal_id": terminal_id, "session_uuid": str(session_uuid)}
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

    @with_db_transaction
    async def register_terminal(
        self, *, conn: asyncpg.Connection, registration_uuid: str
    ) -> Optional[TerminalRegistrationSuccess]:
        row = await conn.fetchrow("select * from terminal where registration_uuid = $1", registration_uuid)
        if row is None:
            return None
        terminal = Terminal.from_db(row)
        session_uuid = await conn.fetchval(
            "update terminal set session_uuid = gen_random_uuid(), registration_uuid = null where id = $1 "
            "returning session_uuid",
            terminal.id,
        )
        token = self._create_access_token(terminal_id=terminal.id, session_uuid=session_uuid)
        return TerminalRegistrationSuccess(terminal=terminal, token=token)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def logout_terminal(self, *, conn: asyncpg.Connection, terminal_id: int) -> bool:
        id_ = await conn.fetchval(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1 returning id",
            terminal_id,
        )
        return id_ is not None

    @with_db_transaction
    async def get_terminal_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[Terminal]:
        token_payload = self._decode_jwt_payload(token)
        if token_payload is None:
            return None

        row = await conn.fetchrow(
            "select * from terminal where id = $1 and session_uuid = $2",
            token_payload.terminal_id,
            token_payload.session_uuid,
        )
        if row is None:
            return None

        return Terminal.from_db(row)

    @with_db_transaction
    @requires_terminal
    async def login_cashier(self, *, conn: asyncpg.Connection, current_terminal: Terminal, token_uid: str) -> bool:
        # TODO: once proper token uid authentication is in place use that here
        user_id = await conn.fetchval(
            "select usr.id from usr join account a on usr.account = a.id join token t on t.id = a.token_id "
            "where t.uid = $1",
            token_uid,
        )
        if user_id is None:
            return False

        await conn.execute("update terminal set active_cashier = $1 where id = $2", user_id, current_terminal.id)
        return True
