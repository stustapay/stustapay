import uuid
from typing import Optional

import asyncpg
from pydantic import BaseModel, ValidationError
from jose import JWTError, jwt

from .dbservice import DBService, with_db_transaction
from ..schema.terminal import Terminal, NewTerminal
from ..schema.user import User


class TokenMetadata(BaseModel):
    terminal_id: int
    session_uuid: int


class TerminalLoginResult(BaseModel):
    terminal: Terminal
    token: str


def _to_string_nullable(t) -> Optional[str]:
    return str(t) if t is not None else None


class TerminalService(DBService):
    @with_db_transaction
    async def create_terminal(self, *, conn: asyncpg.Connection, user: User, terminal: NewTerminal) -> Terminal:
        del user
        row = await conn.fetchrow(
            "insert into terminal (name, description, registration_uuid, tseid, active_shift, active_profile, active_cashier) "
            "values ($1, $2, $3, $4, $5, $6, $7) returning id, name, description, registration_uuid, "
            "tseid, active_shift, active_profile, active_cashier",
            terminal.name,
            terminal.description,
            uuid.uuid4(),
            terminal.tseid,
            terminal.active_shift,
            terminal.active_profile,
            terminal.active_cashier,
        )

        return Terminal(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tseid=row["tseid"],
            active_shift=row["active_shift"],
            active_profile=row["active_profile"],
            active_cashier=row["active_cashier"],
        )

    @with_db_transaction
    async def list_terminals(self, *, conn: asyncpg.Connection, user: User) -> list[Terminal]:
        del user
        cursor = conn.cursor("select * from terminal")
        result = []
        async for row in cursor:
            result.append(
                Terminal(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    registration_uuid=_to_string_nullable(row["registration_uuid"]),
                    tseid=row["tseid"],
                    active_shift=row["active_shift"],
                    active_profile=row["active_profile"],
                    active_cashier=row["active_cashier"],
                )
            )
        return result

    @with_db_transaction
    async def get_terminal(self, *, conn: asyncpg.Connection, user: User, terminal_id: str) -> Optional[Terminal]:
        del user
        row = await conn.fetchrow("select * from terminal where id = $1", terminal_id)
        if row is None:
            return None

        return Terminal(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tseid=row["tseid"],
            active_shift=row["active_shift"],
            active_profile=row["active_profile"],
            active_cashier=row["active_cashier"],
        )

    @with_db_transaction
    async def update_terminal(
        self, *, conn: asyncpg.Connection, user: User, terminal_id: str, terminal: NewTerminal
    ) -> Optional[Terminal]:
        del user
        row = await conn.fetchrow(
            "update terminal set name = $2, description = $3, tseid = $4, active_shift = $5, active_profile = $6, active_cashier = $7 "
            "where id = $1 returning id, name, description, registration_uuid, tseid, active_shift, active_profile, "
            "active_cashier",
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

        return Terminal(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tseid=row["tseid"],
            active_shift=row["active_shift"],
            active_profile=row["active_profile"],
            active_cashier=row["active_cashier"],
        )

    @with_db_transaction
    async def delete_terminal(self, *, conn: asyncpg.Connection, user: User, terminal_id: int) -> bool:
        del user
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
    async def login_terminal(
        self, *, conn: asyncpg.Connection, registration_uuid: str
    ) -> Optional[TerminalLoginResult]:
        row = await conn.fetchrow("select * from terminal where registration_uuid = $1", registration_uuid)
        if row is None:
            return None
        terminal = Terminal(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tseid=row["tseid"],
            active_shift=row["active_shift"],
            active_profile=row["active_profile"],
            active_cashier=row["active_cashier"],
        )
        session_uuid = uuid.uuid4()
        await conn.execute("update terminal set session_uuid = $2 where id = $1", terminal.id, session_uuid)
        token = self._create_access_token(terminal_id=terminal.id, session_uuid=session_uuid)
        return TerminalLoginResult(terminal=terminal, token=token)

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

        return Terminal(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            registration_uuid=_to_string_nullable(row["registration_uuid"]),
            tseid=row["tseid"],
            active_shift=row["active_shift"],
            active_profile=row["active_profile"],
            active_cashier=row["active_cashier"],
        )
