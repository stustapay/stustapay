import asyncpg
from fastapi import Request, Depends

from ..config import Config


def get_config(request: Request) -> Config:
    return request.state.config


def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.state.db_pool


async def get_db_conn(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
) -> asyncpg.Connection:
    async with db_pool.acquire() as conn:
        yield conn
