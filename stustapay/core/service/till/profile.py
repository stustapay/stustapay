from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.till import (
    TillProfile,
    NewTillProfile,
)
from stustapay.core.schema.user import Privilege
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.user import AuthService


class TillProfileService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @staticmethod
    async def _get_profile(*, conn: asyncpg.Connection, profile_id: int) -> Optional[TillProfile]:
        row = await conn.fetchrow("select * from till_profile_with_allowed_roles where id = $1", profile_id)
        if row is None:
            return None

        return TillProfile.parse_obj(row)

    @staticmethod
    async def _update_allowed_profile_roles(*, conn: asyncpg.Connection, profile_id: int, role_names: list[str]):
        for role_name in role_names:
            role_id = await conn.fetchval("select id from user_role where name = $1", role_name)
            if role_id is None:
                raise InvalidArgument(f"User role '{role_name}' does not exist")
            await conn.execute(
                "insert into allowed_user_roles_for_till_profile (profile_id, role_id) values ($1, $2)",
                profile_id,
                role_id,
            )

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def create_profile(self, *, conn: asyncpg.Connection, profile: NewTillProfile) -> TillProfile:
        profile_id = await conn.fetchval(
            "insert into till_profile (name, description, allow_top_up, allow_cash_out, allow_ticket_sale, layout_id) "
            "values ($1, $2, $3, $4, $5, $6) "
            "returning id",
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.allow_cash_out,
            profile.allow_ticket_sale,
            profile.layout_id,
        )

        await self._update_allowed_profile_roles(
            conn=conn, profile_id=profile_id, role_names=profile.allowed_role_names
        )

        resulting_profile = await self._get_profile(conn=conn, profile_id=profile_id)
        assert resulting_profile is not None
        return resulting_profile

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def list_profiles(self, *, conn: asyncpg.Connection) -> list[TillProfile]:
        cursor = conn.cursor("select * from till_profile_with_allowed_roles")
        result = []
        async for row in cursor:
            result.append(TillProfile.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def get_profile(self, *, conn: asyncpg.Connection, profile_id: int) -> Optional[TillProfile]:
        return await self._get_profile(conn=conn, profile_id=profile_id)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def update_profile(
        self, *, conn: asyncpg.Connection, profile_id: int, profile: NewTillProfile
    ) -> Optional[TillProfile]:
        p_id = await conn.fetchval(
            "update till_profile set name = $2, description = $3, allow_top_up = $4, allow_cash_out = $5, "
            "   allow_ticket_sale = $6, layout_id = $7 "
            "where id = $1 returning id ",
            profile_id,
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.allow_cash_out,
            profile.allow_ticket_sale,
            profile.layout_id,
        )
        if p_id is None:
            return None

        await conn.execute("delete from allowed_user_roles_for_till_profile where profile_id = $1", profile_id)
        await self._update_allowed_profile_roles(
            conn=conn, profile_id=profile_id, role_names=profile.allowed_role_names
        )

        resulting_profile = await self._get_profile(conn=conn, profile_id=profile_id)
        assert resulting_profile is not None
        return resulting_profile

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def delete_profile(self, *, conn: asyncpg.Connection, till_profile_id: int) -> bool:
        result = await conn.execute(
            "delete from till_profile where id = $1",
            till_profile_id,
        )
        return result != "DELETE 0"
