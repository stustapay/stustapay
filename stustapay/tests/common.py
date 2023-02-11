# pylint: disable=attribute-defined-outside-init
import asyncio
import logging
import os
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool

from stustapay.core.config import Config
from stustapay.core import database


def get_test_db_config() -> dict:
    return {
        "user": os.environ.get("TEST_DB_USER", None),
        "password": os.environ.get("TEST_DB_PASSWORD", None),
        "host": os.environ.get("TEST_DB_HOST", None),
        "port": int(os.environ.get("TEST_DB_PORT", 0)) or None,
        "dbname": os.environ.get("TEST_DB_DATABASE", "stustapay-test"),
    }


# input structure for core.config.Config
TEST_CONFIG = {
    "administration": {
        "host": "localhost",
        "port": 8081,
    },
    "terminalserver": {
        "host": "localhost",
        "port": 8080,
    },
    "database": get_test_db_config(),
}


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    cfg = get_test_db_config()
    pool = await asyncpg.create_pool(
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["dbname"],
        host=cfg["host"],
        port=cfg["port"],
        min_size=5,
        max_size=5,
    )

    await database.reset_schema(pool)
    await database.apply_revisions(pool)

    return pool


testing_lock = asyncio.Lock()


class BaseTestCase(TestCase):
    def __init__(self, *args, log_level=logging.DEBUG, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=log_level)

    async def asyncSetUp(self) -> None:
        await testing_lock.acquire()
        self.db_pool = await get_test_db()
        self.db_conn: asyncpg.Connection = await self.db_pool.acquire()
        self.test_config = Config.parse_obj(TEST_CONFIG)

    async def asyncTearDown(self) -> None:
        await self.db_conn.close()
        await self.db_pool.close()

        testing_lock.release()
