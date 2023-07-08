import uuid
from typing import Optional

import asyncpg

from stustapay.core.schema.till import NewTill, Till


async def create_till(*, conn: asyncpg.Connection, till: NewTill) -> Till:
    row = await conn.fetchrow(
        "insert into till "
        "   (name, description, registration_uuid, active_shift, active_profile_id) "
        "values ($1, $2, $3, $4, $5) returning id, name, description, registration_uuid, session_uuid, "
        "   tse_id, active_shift, active_profile_id, z_nr",
        till.name,
        till.description,
        uuid.uuid4(),
        till.active_shift,
        till.active_profile_id,
    )

    return Till.parse_obj(row)


async def fetch_till(*, conn: asyncpg.Connection, till_id: int) -> Optional[Till]:
    row = await conn.fetchrow("select * from till_with_cash_register where id = $1", till_id)
    if row is None:
        return None

    return Till.parse_obj(row)
