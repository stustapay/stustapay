from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.till import (
    TillProfile,
    NewTillProfile,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.dbservice import DBService, with_db_transaction, requires_user_privileges
from stustapay.core.service.user import UserService


class TillProfileService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, user_service: UserService):
        super().__init__(db_pool, config)
        self.user_service = user_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_profile(self, *, conn: asyncpg.Connection, profile: NewTillProfile) -> TillProfile:
        row = await conn.fetchrow(
            "insert into till_profile (name, description, allow_top_up, layout_id) values ($1, $2, $3, $4) "
            "returning id, name, description, allow_top_up, layout_id",
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.layout_id,
        )

        return TillProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_profiles(self, *, conn: asyncpg.Connection) -> list[TillProfile]:
        cursor = conn.cursor("select * from till_profile")
        result = []
        async for row in cursor:
            result.append(TillProfile.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_profile(self, *, conn: asyncpg.Connection, profile_id: int) -> Optional[TillProfile]:
        row = await conn.fetchrow("select * from till_profile where id = $1", profile_id)
        if row is None:
            return None

        return TillProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_profile(
        self, *, conn: asyncpg.Connection, profile_id: int, profile: NewTillProfile
    ) -> Optional[TillProfile]:
        row = await conn.fetchrow(
            "update till_profile set name = $2, description = $3, allow_top_up = $4, layout_id = $4 where id = $1 "
            "returning id, name, description, allow_top_up, layout_id",
            profile_id,
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.layout_id,
        )
        if row is None:
            return None

        return TillProfile.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_profile(self, *, conn: asyncpg.Connection, till_profile_id: int) -> bool:
        result = await conn.execute(
            "delete from till_profile where id = $1",
            till_profile_id,
        )
        return result != "DELETE 0"
