"""
database interaction
"""

from abc import ABC
from functools import wraps
from inspect import signature

from asyncpg.pool import Pool

from stustapay.core.config import Config
from stustapay.core.schema.user import User, Privilege


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


def requires_user_privileges(privileges: list[Privilege]):
    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            if "current_user" not in kwargs:
                raise RuntimeError("current_user was not provided to service function call")

            user: User = kwargs["current_user"]
            for privilege in privileges:
                if privilege not in user.privileges:
                    raise PermissionError(f"user does not have required privilege: {privilege}")

            if "current_user" not in signature(func).parameters:
                kwargs.pop("current_user")

            return await func(self, **kwargs)

        return wrapper

    return f


class DBService(ABC):
    """
    base class for all database interaction
    """

    def __init__(self, db_pool: Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config
