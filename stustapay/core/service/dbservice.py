"""
database interaction
"""

from abc import ABC
from functools import wraps

from asyncpg.pool import Pool

from stustapay.core.config import Config


def with_db_connection(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        async with self.db_pool.acquire() as conn:
            return await func(self, conn=conn, **kwargs)

    return wrapper


def with_db_transaction(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                return await func(self, conn=conn, **kwargs)

    return wrapper


class DBService(ABC):
    """
    base class for all database interaction
    """

    def __init__(self, db_pool: Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config
