import argparse
import asyncio
import json
import logging

from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.user import AuthService
from stustapay.framework.subcommand import SubCommand

from .routers import auth, base, sumup


class Api(SubCommand[Config]):
    def __init__(self, args, config: Config, **rest):
        del rest  # unused
        self.args = args

        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)

        self.server = Server(
            title="StuStaPay Customer Portal API",
            config=config.customer_portal,
            cors=True,
        )

        self.server.add_router(auth.router)
        self.server.add_router(base.router)
        self.server.add_router(sumup.router)

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparser.add_argument(
            "--show-openapi",
            action="store_true",
        )

    async def run(self):
        if self.args.show_openapi:
            print(json.dumps(self.server.get_openapi_spec()))
            return

        db_pool = await self.server.db_connect(self.cfg.database)
        await database.check_revision_version(db_pool)

        auth_service = AuthService(db_pool=db_pool, config=self.cfg)
        config_service = ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        customer_service = CustomerService(
            db_pool=db_pool, config=self.cfg, auth_service=auth_service, config_service=config_service
        )

        await customer_service.sumup.check_sumup_auth()

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            config_service=ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            customer_service=customer_service,
        )

        try:
            self.server.add_task(asyncio.create_task(run_healthcheck(db_pool=db_pool, service_name="customer_portal")))
            self.server.add_task(asyncio.create_task(customer_service.sumup.run_sumup_checkout_processing()))
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
