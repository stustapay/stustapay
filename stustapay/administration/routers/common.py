import asyncpg
from fastapi import APIRouter, Depends

from stustapay.core.http.context import get_db_conn

router = APIRouter(
    prefix="",
)


@router.get("/")
async def info(conn: asyncpg.Connection = Depends(get_db_conn)):
    dbver = await conn.fetchrow("select version();")
    if dbver is None:
        raise Exception("version failed")
    return {"db_version": f"{dbver[0]}"}
