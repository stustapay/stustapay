# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import asyncio
import logging
import os
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool

from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.auth import AuthService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService


def get_test_db_config() -> dict:
    return {
        "user": os.environ.get("TEST_DB_USER", None),
        "password": os.environ.get("TEST_DB_PASSWORD", None),
        "host": os.environ.get("TEST_DB_HOST", None),
        "port": int(os.environ.get("TEST_DB_PORT", 0)) or None,
        "dbname": os.environ.get("TEST_DB_DATABASE", "stustapay_test"),
    }


# input structure for core.config.Config
TEST_CONFIG = {
    "core": {"secret_key": "asdf1234"},
    "administration": {
        "base_url": "http://localhost:8081",
        "host": "localhost",
        "port": 8081,
    },
    "terminalserver": {
        "base_url": "http://localhost:8080",
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

        self.auth_service = AuthService(db_pool=self.db_pool, config=self.test_config)
        self.user_service = UserService(db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service)
        self.till_service = TillService(db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service)

        self.admin_user = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test-admin-user", description="", privileges=[Privilege.admin], display_name="Admin"
            ),
            password="asdf",
        )
        self.admin_token = (await self.user_service.login_user(username=self.admin_user.login, password="asdf")).token
        self.cashier_user = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test-cashier-user", description="", privileges=[Privilege.cashier], display_name="Cashier"
            ),
            password="asdf",
        )
        self.cashier_token = (
            await self.user_service.login_user(username=self.cashier_user.login, password="asdf")
        ).token

    async def asyncTearDown(self) -> None:
        await self.db_conn.close()
        await self.db_pool.close()

        testing_lock.release()

    async def create_terminal_token(self) -> None:
        """
        creates a basic terminal login
        """
        till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(name="test-layout", description="", button_ids=[]),
        )
        till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="test-profile", description="", layout_id=till_layout.id, allow_top_up=True, allow_cash_out=True
            ),
        )
        self.till = await self.till_service.create_till(
            token=self.admin_token,
            till=NewTill(
                name="test-till",
                active_profile_id=till_profile.id,
            ),
        )
        self.terminal_token = (
            await self.till_service.register_terminal(registration_uuid=self.till.registration_uuid)
        ).token
