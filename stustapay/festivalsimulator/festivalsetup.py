# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import argparse
import asyncio
import logging
import sys
import threading
from contextlib import contextmanager
from pathlib import Path

import asyncpg

from stustapay.administration.server import Api as AdminApi
from stustapay.bon.config import read_config as read_bon_config
from stustapay.bon.generator import Generator
from stustapay.core.config import Config
from stustapay.core.database import create_db_pool, rebuild_with
from stustapay.core.schema.till import NewTill, NewCashRegisterStocking, NewCashRegister
from stustapay.core.schema.user import UserWithoutId, CASHIER_ROLE_NAME
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import with_db_transaction, OptionalUserContext
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.core.subcommand import SubCommand
from stustapay.customer_portal.server import Api as CustomerApi
from stustapay.terminalserver.server import Api as TerminalApi
from stustapay.tse.config import read_config as read_tse_config
from stustapay.tse.signature_processor import SignatureProcessor
from stustapay.tse.simulator import Simulator as TseSimulator

SAMPLE_DATA = Path(__file__).parent / "assets" / "sample_data.sql"

PROFILE_ID_BEER = 0
PROFILE_ID_COCKTAIL = 1
PROFILE_ID_TOPUP = 2
PROFILE_ID_TICKET = 3

CASHIER_TAG_START = 1000
CUSTOMER_TAG_START = 100000


@contextmanager
def empty_sysargs():
    args = sys.argv
    sys.argv = []
    try:
        yield None
    finally:
        sys.argv = args


class FestivalSetup(SubCommand):
    def __init__(self, args, config: Config, **rest):
        del rest  # unused
        self.args = args

        self.config = config
        self.tse_config = read_tse_config(args.tse_config)
        self.bon_config = read_bon_config(args.config_path)

        self.logger = logging.getLogger(__name__)

        self.db_pool = None

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparser.add_argument(
            "--tse-config",
            type=str,
            help="tse config",
            default=str(Path(__file__).parent.parent.parent / "etc" / "tse.yaml"),
        )

        subparsers = subparser.add_subparsers(dest="action")
        database_parser = subparsers.add_parser("database", formatter_class=argparse.ArgumentDefaultsHelpFormatter)
        database_parser.add_argument(
            "--db-init-file",
            type=str,
            help="Name of .sql file in the 'core/schema/example_data' that contains the initial DB contents",
            default="simulator_data",
        )
        database_parser.add_argument("--n-tags", type=int, help="number of tags to create", default=1000)
        database_parser.add_argument("--n-entry-tills", type=int, help="number of entry tills to create", default=10)
        database_parser.add_argument("--n-topup-tills", type=int, help="number of topup tills to create", default=8)
        database_parser.add_argument("--n-beer-tills", type=int, help="number of beer tills to create", default=20)
        database_parser.add_argument(
            "--n-cocktail-tills", type=int, help="number of cocktail tills to create", default=3
        )
        database_parser.add_argument(
            "--n-cashiers", type=int, help="number of cashiers to create, default is number of tills plus 50%"
        )

        start_api_parser = subparsers.add_parser("start-api")
        start_api_parser.add_argument("--no-tse", action="store_true")
        start_api_parser.add_argument("--no-bon", action="store_true")

    def run_admin_api(self):
        parser = argparse.ArgumentParser()
        AdminApi.argparse_register(parser)
        with empty_sysargs():
            args = parser.parse_args()
        admin_api = AdminApi(args=args, config=self.config)
        asyncio.run(admin_api.run())

    def run_terminal_api(self):
        parser = argparse.ArgumentParser()
        TerminalApi.argparse_register(parser)
        with empty_sysargs():
            args = parser.parse_args()
        terminal_api = TerminalApi(args=args, config=self.config)
        asyncio.run(terminal_api.run())

    def run_customer_api(self):
        parser = argparse.ArgumentParser()
        CustomerApi.argparse_register(parser)
        with empty_sysargs():
            args = parser.parse_args()
        customer_api = CustomerApi(args=args, config=self.config)
        asyncio.run(customer_api.run())

    def run_bon_generator(self):
        parser = argparse.ArgumentParser()
        Generator.argparse_register(parser)
        with empty_sysargs():
            args = parser.parse_args()
        bon_generator = Generator(args=args, config=self.bon_config)
        asyncio.run(bon_generator.run())

    def run_tse_simulator(self):
        parser = argparse.ArgumentParser()
        TseSimulator.argparse_register(parser)
        with empty_sysargs():
            sys.argv = ["-f"]
            args = parser.parse_args()
        simulator = TseSimulator(args=args, config=self.tse_config)
        asyncio.run(simulator.run())

    def run_tse_signature_processor(self):
        parser = argparse.ArgumentParser()
        SignatureProcessor.argparse_register(parser)
        with empty_sysargs():
            args = parser.parse_args()
        processor = SignatureProcessor(args=args, config=self.tse_config)
        asyncio.run(processor.run())

    async def run(self):
        if self.args.action == "database":
            await self.setup()
        elif self.args.action == "start-api":
            await self.start()
        else:
            self.logger.error(f"Unknown action: {self.args.action}")

    @with_db_transaction
    async def _create_tags(self, conn: asyncpg.Connection):
        self.logger.info(f"Creating {self.args.n_tags} tags")
        for i in range(self.args.n_tags):
            await conn.execute("insert into user_tag (uid, pin) values ($1, $2)", i + CUSTOMER_TAG_START, "pin")

    async def _create_tills(self, admin_token: str, till_service: TillService, n_tills: int):
        self.logger.info(f"Creating {n_tills} tills")
        ctx = OptionalUserContext(token=admin_token)
        for i in range(self.args.n_topup_tills):
            await till_service.create_till(
                ctx,
                till=NewTill(name=f"Aufladekasse {i}", active_profile_id=PROFILE_ID_TOPUP),
            )
        for i in range(self.args.n_entry_tills):
            await till_service.create_till(
                ctx,
                till=NewTill(name=f"Eintrittskasse {i}", active_profile_id=PROFILE_ID_TICKET),
            )
        for i in range(self.args.n_beer_tills):
            await till_service.create_till(
                ctx,
                token=admin_token,
                till=NewTill(name=f"Bierkasse {i}", active_profile_id=PROFILE_ID_BEER),
            )
        for i in range(self.args.n_cocktail_tills):
            await till_service.create_till(
                ctx,
                till=NewTill(name=f"Cocktailkasse {i}", active_profile_id=PROFILE_ID_COCKTAIL),
            )
        for i in range(n_tills):
            await till_service.register.create_cash_register(ctx, new_register=NewCashRegister(name=f"Blechkasse {i}"))

        await till_service.register.create_cash_register_stockings(
            token=admin_token, stocking=NewCashRegisterStocking(name="Stocking", euro20=2, euro10=1)
        )

    async def _create_cashiers(self, user_service: UserService, n_cashiers: int):
        assert self.db_pool is not None

        self.logger.info(f"Creating {n_cashiers} cashiers")
        for i in range(n_cashiers):
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
        db_init_file: str = self.args.db_init_file
        if not db_init_file.endswith(".sql"):
            db_init_file = f"{db_init_file}.sql"

        self.db_pool = await create_db_pool(self.config.database)
        await rebuild_with(self.db_pool, db_init_file)
        n_tills = (
            self.args.n_entry_tills + self.args.n_topup_tills + self.args.n_beer_tills + self.args.n_cocktail_tills
        )
        n_cashiers = max(int(n_tills * 1.5), self.args.n_cashiers or 0)

        await self._create_tags()
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        till_service = TillService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        user_service = UserService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        admin_login = await user_service.login_user(username="admin", password="admin")
        assert admin_login is not None
        admin_token = admin_login.token
        await self._create_tills(admin_token=admin_token, till_service=till_service, n_tills=n_tills)
        await self._create_cashiers(user_service=user_service, n_cashiers=n_cashiers)

    async def start(self):
        admin_api_thread = threading.Thread(target=self.run_admin_api)
        terminal_api_thread = threading.Thread(target=self.run_terminal_api)
        customer_api_thread = threading.Thread(target=self.run_customer_api)
        threads = [admin_api_thread, terminal_api_thread, customer_api_thread]
        if not self.args.no_bon:
            bon_generator_thread = threading.Thread(target=self.run_bon_generator)
            bon_generator_thread.start()
            threads.append(bon_generator_thread)

        if not self.args.no_tse:
            signature_processor_thread = threading.Thread(target=self.run_tse_signature_processor)
            tse_simulator_thread = threading.Thread(target=self.run_tse_simulator)
            signature_processor_thread.start()
            tse_simulator_thread.start()
            threads.append(tse_simulator_thread)
            threads.append(signature_processor_thread)

        admin_api_thread.start()
        terminal_api_thread.start()
        customer_api_thread.start()

        admin_api_thread.join()
        terminal_api_thread.join()
        customer_api_thread.join()

        for thread in threads:
            thread.join()
