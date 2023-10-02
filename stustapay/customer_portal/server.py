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

from .routers import auth, base, sumup


def get_server(config: Config):
    server = Server(
        title="StuStaPay Customer Portal API",
        config=config.customer_portal,
        cors=True,
    )

    server.add_router(auth.router)
    server.add_router(base.router)
    server.add_router(sumup.router)
    return server


def print_openapi(config: Config):
    server = get_server(config)
    print(json.dumps(server.get_openapi_spec()))


class Api:
    def __init__(self, config: Config):
        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)
        self.server = get_server(config)

    async def run(self):
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
