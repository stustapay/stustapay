import asyncio
import json
import logging

from sftkit.http import Server

from stustapay import __version__
from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.http.context import Context
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.mail import MailService
from stustapay.core.service.media import MediaService
from stustapay.core.service.order import OrderService
from stustapay.core.service.user import AuthService

from .routers import auth, base, sumup


def get_server(config: Config):
    server = Server(
        title="StuStaPay Customer Portal API",
        config=config.customerportal,
        license_name="AGPL-3.0",
        version=__version__,
        cors=True,
    )

    server.add_router(auth.router)
    server.add_router(base.router)
    server.add_router(sumup.router)
    return server


def print_openapi(config: Config):
    server = get_server(config)
    print(json.dumps(server.get_openapi_spec(), indent=2))


class Api:
    def __init__(self, config: Config):
        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)
        self.server = get_server(config)

    async def run(self):
        db = get_database(self.cfg.database)
        db_pool = await db.create_pool()
        await database.check_revision_version(db)

        auth_service = AuthService(db_pool=db_pool, config=self.cfg)
        config_service = ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        customer_service = CustomerService(
            db_pool=db_pool, config=self.cfg, auth_service=auth_service, config_service=config_service
        )
        mail_service = MailService(db_pool=db_pool, config=self.cfg)

        context = Context(
            config=self.cfg,
            config_service=ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            order_service=OrderService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            media_service=MediaService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            customer_service=customer_service,
            mail_service=mail_service,
        )

        try:
            self.server.add_task(asyncio.create_task(run_healthcheck(db, service_name="customer_portal")))
            await self.server.run(context)
        finally:
            await db_pool.close()
