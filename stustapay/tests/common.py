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
from stustapay.core.schema.user import (
    UserWithoutId,
    ADMIN_ROLE_NAME,
    CASHIER_ROLE_ID,
    ADMIN_ROLE_ID,
    UserTag,
    FINANZORGA_ROLE_NAME,
    CASHIER_ROLE_NAME,
)
from stustapay.core.service.account import AccountService
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
    "core": {"secret_key": "stuff1234"},
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
        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.till_service = TillService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
        )

        self.admin_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (13131313) returning uid")
        self.admin_user = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test-admin-user",
                description="",
                role_names=[ADMIN_ROLE_NAME],
                display_name="Admin",
                user_tag_uid=self.admin_tag_uid,
            ),
            password="rolf",
        )
        self.admin_token = (await self.user_service.login_user(username=self.admin_user.login, password="rolf")).token
        self.finanzorga_tag_uid = await self.db_conn.fetchval(
            "insert into user_tag (uid) values (1313131313) returning uid"
        )
        self.finanzorga_user = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test-finanzorga-user",
                description="",
                role_names=[FINANZORGA_ROLE_NAME],
                display_name="Finanzorga",
                user_tag_uid=self.finanzorga_tag_uid,
            ),
            password="rolf",
        )
        self.cashier_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning uid")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test-cashier-user",
                user_tag_uid=self.cashier_tag_uid,
                description="",
                role_names=[],
                display_name="Cashier",
            ),
            password="rolf",
        )
        await self.user_service.promote_to_cashier(token=self.admin_token, user_id=self.cashier.id)
        self.cashier = await self.user_service.get_user(token=self.admin_token, user_id=self.cashier.id)

        self.cashier_token = (await self.user_service.login_user(username=self.cashier.login, password="rolf")).token

    async def _assert_account_balance(self, account_id: int, balance: float):
        account = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(account)
        self.assertEqual(balance, account.balance)

    async def asyncTearDown(self) -> None:
        await self.db_conn.close()
        await self.db_pool.close()

        testing_lock.release()


class TerminalTestCase(BaseTestCase):
    async def _login_supervised_user(self, user_tag_uid: int, user_role_id: int):
        await self.till_service.logout_user(token=self.terminal_token)
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.admin_tag_uid), user_role_id=ADMIN_ROLE_ID
        )
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=user_tag_uid), user_role_id=user_role_id
        )

    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(name="test-layout", description="", button_ids=[]),
        )
        self.till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="test-profile",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        self.till = await self.till_service.create_till(
            token=self.admin_token,
            till=NewTill(
                name="test-till",
                active_profile_id=self.till_profile.id,
            ),
        )
        self.terminal_token = (
            await self.till_service.register_terminal(registration_uuid=self.till.registration_uuid)
        ).token

        # log in the cashier user
        await self._login_supervised_user(user_tag_uid=self.cashier_tag_uid, user_role_id=CASHIER_ROLE_ID)
