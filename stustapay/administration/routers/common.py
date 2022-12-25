import asyncpg
from fastapi import APIRouter, Depends

from stustapay.core.http.dependencies import get_db_conn

router = APIRouter(
    prefix="",
)


@router.get("/")
async def info(conn: asyncpg.Connection = Depends(get_db_conn)):
    dbver = await conn.fetchrow("select version();")
    return {"db_version": f"{dbver[0]}"}
