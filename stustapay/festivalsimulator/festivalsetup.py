# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import argparse
import asyncio
import logging
import threading
from pathlib import Path

import asyncpg

from stustapay.administration.server import Api as AdminApi
from stustapay.core.config import Config
from stustapay.core.database import create_db_pool, reset_schema, apply_revisions
from stustapay.core.schema.till import NewTill, NewCashRegisterStocking
from stustapay.core.schema.user import UserWithoutId, CASHIER_ROLE_NAME
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import with_db_transaction
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.core.subcommand import SubCommand
from stustapay.terminalserver.server import Api as TerminalApi

SAMPLE_DATA = Path(__file__).parent / "assets" / "sample_data.sql"

PROFILE_ID_BEER = 0
PROFILE_ID_COCKTAIL = 1
PROFILE_ID_TOPUP = 2
PROFILE_ID_TICKET = 3

CASHIER_TAG_START = 1000
CUSTOMER_TAG_START = 100000


class FestivalSetup(SubCommand):
    def __init__(self, args, config: Config, **rest):
        del rest  # unused
        self.args = args

        self.config = config

        self.logger = logging.getLogger(__name__)

        self.db_pool = None

        self.n_tills = (
            self.args.n_entry_tills + self.args.n_topup_tills + self.args.n_beer_tills + self.args.n_cocktail_tills
        )

        self.n_cashiers = self.n_tills

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparser.add_argument("--n-tags", type=int, help="number of tags to create", default=1000)
        subparser.add_argument("--n-entry-tills", type=int, help="number of entry tills to create", default=10)
        subparser.add_argument("--n-topup-tills", type=int, help="number of topup tills to create", default=8)
        subparser.add_argument("--n-beer-tills", type=int, help="number of beer tills to create", default=20)
        subparser.add_argument("--n-cocktail-tills", type=int, help="number of cocktail tills to create", default=3)

    def run_admin_api(self):
        admin_api = AdminApi(args=self.args, config=self.config)
        asyncio.run(admin_api.run())

    def run_terminal_api(self):
        terminal_api = TerminalApi(args=self.args, config=self.config)
        asyncio.run(terminal_api.run())

    async def run(self):
        await self.setup()

        admin_api_thread = threading.Thread(target=self.run_admin_api)
        terminal_api_thread = threading.Thread(target=self.run_terminal_api)

        admin_api_thread.start()
        terminal_api_thread.start()

        admin_api_thread.join()
        terminal_api_thread.join()

    @with_db_transaction
    async def _create_tags(self, conn: asyncpg.Connection):
        self.logger.info(f"Creating {self.args.n_tags} tags")
        for i in range(self.args.n_tags):
            await conn.execute("insert into user_tag (uid) values ($1)", i + CUSTOMER_TAG_START)

    async def _create_tills(self, admin_token: str, till_service: TillService):
        self.logger.info(f"Creating {self.n_tills} tills")
        for i in range(self.args.n_topup_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Aufladekasse {i}", active_profile_id=PROFILE_ID_TOPUP),
            )
        for i in range(self.args.n_entry_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Eintrittskasse {i}", active_profile_id=PROFILE_ID_TICKET),
            )
        for i in range(self.args.n_beer_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Bierkasse {i}", active_profile_id=PROFILE_ID_BEER),
            )
        for i in range(self.args.n_cocktail_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Cocktailkasse {i}", active_profile_id=PROFILE_ID_COCKTAIL),
            )

    async def _create_cashiers(self, user_service: UserService):
        assert self.db_pool is not None

        self.logger.info(f"Creating {self.n_cashiers} cashiers")
        for i in range(self.n_cashiers):
            cashier_tag_uid = await self.db_pool.fetchval(
                "insert into user_tag (uid) values ($1) returning uid", i + CASHIER_TAG_START
            )
            await user_service.create_user_no_auth(
                new_user=UserWithoutId(
                    login=f"Cashier {i}",
                    display_name=f"Cashier {i}",
                    role_names=[CASHIER_ROLE_NAME],
                    user_tag_uid=cashier_tag_uid,
                )
            )

    async def setup(self):
        self.db_pool = await create_db_pool(self.config.database)
        await reset_schema(db_pool=self.db_pool)
        await apply_revisions(db_pool=self.db_pool)

        content = SAMPLE_DATA.read_text("utf-8")
        self.logger.info(f"Applying test data {SAMPLE_DATA}")
        await self.db_pool.execute(content)

        await self._create_tags()  # pylint: disable=no-value-for-parameter
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        till_service = TillService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        user_service = UserService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        admin_login = await user_service.login_user(username="admin", password="admin")  # pylint: disable=missing-kwoa
        assert admin_login is not None
        admin_token = admin_login.token
        await till_service.register.create_cash_register_stockings(
            token=admin_token, stocking=NewCashRegisterStocking(name="Stocking", euro20=2, euro10=1)
        )
        await self._create_tills(admin_token=admin_token, till_service=till_service)
        await self._create_cashiers(user_service=user_service)
