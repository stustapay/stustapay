import uuid
from typing import Optional

import asyncpg
from pydantic import BaseModel, ValidationError
from jose import JWTError, jwt

from .dbservice import DBService, with_db_transaction, requires_user_privileges
from stustapay.core.schema.terminal import Terminal, NewTerminal
from stustapay.core.schema.user import Privilege


class TokenMetadata(BaseModel):
    terminal_id: int
    session_uuid: int


class TerminalRegistrationSuccess(BaseModel):
    terminal: Terminal
    token: str


class TerminalService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_terminal(self, *, conn: asyncpg.Connection, terminal: NewTerminal) -> Terminal:
        row = await conn.fetchrow(
            "insert into terminal (name, description, registration_uuid, tseid, active_shift, active_profile, active_cashier) "
            "values ($1, $2, $3, $4, $5, $6, $7) returning id, name, description, registration_uuid, session_uuid, "
            "tseid, active_shift, active_profile, active_cashier",
            terminal.name,
            terminal.description,
            uuid.uuid4(),
            terminal.tseid,
            terminal.active_shift,
            terminal.active_profile,
            terminal.active_cashier,
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
            "update terminal set name = $2, description = $3, tseid = $4, active_shift = $5, active_profile = $6, active_cashier = $7 "
            "where id = $1 returning id, name, description, registration_uuid, tseid, active_shift, active_profile, session_uuid, active_cashier",
            terminal_id,
            terminal.name,
            terminal.description,
            terminal.tseid,
            terminal.active_shift,
            terminal.active_profile,
            terminal.active_cashier,
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
        session_uuid = uuid.uuid4()
        await conn.execute(
            "update terminal set session_uuid = $2, registration_uuid = null where id = $1",
            terminal.id,
            session_uuid,
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
