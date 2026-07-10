import logging

from sftkit.database import Connection

LOGGER = logging.getLogger(__name__)

TSE_MASTERDATA_QUERY = """
    select
        tse.id,
        tse.serial,
        tse.hashalgo,
        tse.time_format,
        tse.process_data_encoding,
        tse.public_key,
        tse.certificate,
        tse.tse_description,
        tse.type,
        tse.first_operation
    from tse
    where tse.id = $1
"""


async def get_tse_id_for_till_at_z_nr(conn: Connection, till_id: int, z_nr: int) -> int | None:
    till_history = await conn.fetch(
        "select what, tse_id, z_nr from till_tse_history where till_id = $1 order by z_nr",
        till_id,
    )
    register_z_nrs = [entry["z_nr"] for entry in till_history if entry["what"] == "register"]
    if not register_z_nrs:
        return None

    applicable_z_nrs = [entry_z_nr for entry_z_nr in register_z_nrs if z_nr >= entry_z_nr]
    if not applicable_z_nrs:
        return None

    applicable_z_nrs.sort(reverse=True)
    return await conn.fetchval(
        "select tse_id from till_tse_history where till_id = $1 and what = 'register' and z_nr = $2",
        till_id,
        applicable_z_nrs[0],
    )


async def get_tse_masterdata_for_till_at_z_nr(conn: Connection, till_id: int, z_nr: int):
    tse_id = await get_tse_id_for_till_at_z_nr(conn=conn, till_id=till_id, z_nr=z_nr)
    if tse_id is None:
        tse_id = await conn.fetchval("select tse_id from till where id = $1", till_id)
    if tse_id is None:
        LOGGER.warning("Till %s has no TSE assignment for z_nr %s", till_id, z_nr)
        return None
    return await conn.fetchrow(TSE_MASTERDATA_QUERY, tse_id)
