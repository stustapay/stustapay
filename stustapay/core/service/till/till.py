import uuid
from typing import Optional

import asyncpg
from jose import JWTError, jwt
from pydantic import BaseModel, ValidationError

from stustapay.core.config import Config
from stustapay.core.schema.terminal import TerminalConfig, Terminal
from stustapay.core.schema.till import (
    Till,
    NewTill,
    TillButton,
    TillProfile,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.common.dbservice import (
    DBService,
)
from stustapay.core.service.common.decorators import (
    with_db_transaction,
    requires_user_privileges,
    requires_terminal,
)
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.user import UserService


class TokenMetadata(BaseModel):
    till_id: int
    session_uuid: uuid.UUID


class TillRegistrationSuccess(BaseModel):
    till: Till
    token: str


class TillService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, user_service: UserService):
        super().__init__(db_pool, config)
        self.user_service = user_service

        self.profile = TillProfileService(db_pool, config, user_service)
        self.layout = TillLayoutService(db_pool, config, user_service)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_till(self, *, conn: asyncpg.Connection, till: NewTill) -> Till:
        row = await conn.fetchrow(
            "insert into till (name, description, registration_uuid, tse_id, active_shift, active_profile_id, active_user_id) "
            "values ($1, $2, $3, $4, $5, $6, $7) returning id, name, description, registration_uuid, session_uuid, "
            "tse_id, active_shift, active_profile_id, active_user_id",
            till.name,
            till.description,
            uuid.uuid4(),
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
            till.active_user_id,
        )

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_tills(self, *, conn: asyncpg.Connection) -> list[Till]:
        cursor = conn.cursor("select * from till")
        result = []
        async for row in cursor:
            result.append(Till.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_till(self, *, conn: asyncpg.Connection, till_id: str) -> Optional[Till]:
        row = await conn.fetchrow("select * from till where id = $1", till_id)
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_till(self, *, conn: asyncpg.Connection, till_id: str, till: NewTill) -> Optional[Till]:
        row = await conn.fetchrow(
            "update till set name = $2, description = $3, tse_id = $4, active_shift = $5, active_profile_id = $6, active_user_id = $7 "
            "where id = $1 returning id, name, description, registration_uuid, tse_id, active_shift, active_profile_id, session_uuid, active_user_id",
            till_id,
            till.name,
            till.description,
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
            till.active_user_id,
        )
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_till(self, *, conn: asyncpg.Connection, till_id: int) -> bool:
        result = await conn.execute(
            "delete from till where id = $1",
            till_id,
        )
        return result != "DELETE 0"

    def _create_access_token(self, till_id: int, session_uuid: uuid.UUID):
        to_encode = {"till_id": till_id, "session_uuid": str(session_uuid)}
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
    ) -> Optional[TillRegistrationSuccess]:
        row = await conn.fetchrow("select * from till where registration_uuid = $1", registration_uuid)
        if row is None:
            return None
        till = Till.parse_obj(row)
        session_uuid = await conn.fetchval(
            "update till set session_uuid = gen_random_uuid(), registration_uuid = null where id = $1 "
            "returning session_uuid",
            till.id,
        )
        token = self._create_access_token(till_id=till.id, session_uuid=session_uuid)
        return TillRegistrationSuccess(till=till, token=token)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def logout_terminal(self, *, conn: asyncpg.Connection, current_terminal: Terminal) -> bool:
        id_ = await conn.fetchval(
            "update till set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1 returning id",
            current_terminal.till.id,
        )
        return id_ is not None

    @with_db_transaction
    async def get_terminal_from_token(self, *, conn: asyncpg.Connection, token: str) -> Optional[Terminal]:
        token_payload = self._decode_jwt_payload(token)
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

    @with_db_transaction
    @requires_terminal()
    async def login_cashier(self, *, conn: asyncpg.Connection, current_terminal: Terminal, tag_uid: int) -> bool:
        # TODO: once proper token uid authentication is in place use that here
        user_id = await conn.fetchval(
            "select usr.id from usr join user_tag t on t.id = usr.user_tag_id where t.uid = $1",
            tag_uid,
        )
        if user_id is None:
            return False

        t_id = await conn.fetchval(
            "update till set active_user_id = $1 where id = $2 returning id", user_id, current_terminal.till.id
        )
        return t_id is not None

    @with_db_transaction
    @requires_terminal()
    async def get_terminal_config(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal
    ) -> Optional[TerminalConfig]:
        db_profile = await conn.fetchrow(
            "select * from till_profile tp where id = $1", current_terminal.till.active_profile_id
        )
        if db_profile is None:
            return None
        user_privileges = await conn.fetchval(
            "select privileges from usr_with_privileges where id = $1", current_terminal.till.active_user_id
        )
        db_buttons = conn.cursor(
            "select * from till_button_with_products tlwb "
            "join till_layout_to_button tltb on tltb.button_id = tlwb.id "
            "where tltb.layout_id = $1",
            db_profile["layout_id"],
        )
        buttons = []
        async for db_button in db_buttons:
            buttons.append(TillButton.parse_obj(db_button))
        db_profile = await conn.fetchrow(
            "select * from till_profile join till on till_profile.id = till.active_profile_id where till.id = $1",
            current_terminal.till.id,
        )
        profile = TillProfile.parse_obj(db_profile)

        return TerminalConfig(
            id=current_terminal.till.id,
            name=current_terminal.till.name,
            description=current_terminal.till.description,
            user_privileges=user_privileges,
            allow_top_up=profile.allow_top_up,
            buttons=buttons,
        )
