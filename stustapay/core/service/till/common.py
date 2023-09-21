import uuid
from typing import Optional

from stustapay.core.schema.till import NewTill, Till
from stustapay.framework.database import Connection


async def create_till(*, conn: Connection, till: NewTill) -> Till:
    return await conn.fetch_one(
        Till,
        "insert into till "
        "   (name, description, registration_uuid, active_shift, active_profile_id, node_id) "
        "values ($1, $2, $3, $4, $5, $6) returning id, name, description, registration_uuid, session_uuid, "
        "   tse_id, active_shift, active_profile_id, z_nr, node_id",
        till.name,
        till.description,
        uuid.uuid4(),
        till.active_shift,
        till.active_profile_id,
        till.node_id,
    )


async def fetch_till(*, conn: Connection, till_id: int) -> Optional[Till]:
    return await conn.fetch_maybe_one(Till, "select * from till_with_cash_register where id = $1", till_id)
