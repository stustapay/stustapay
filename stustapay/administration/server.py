import logging

from stustapay.core.config import Config
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.subcommand import SubCommand

from .routers import products, users, common, tax_rates, auth
from ..core.service.products import ProductService
from ..core.service.tax_rates import TaxRateService
from ..core.service.users import UserService


class Api(SubCommand):
    def __init__(self, args, config: Config, **rest):
        del args, rest  # unused

        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)

        self.server = Server(
            title="StuStaPay Administration API",
            config=config.administration,
            cors=True,
        )

        self.server.add_router(products.router)
        self.server.add_router(users.router)
        self.server.add_router(common.router)
        self.server.add_router(tax_rates.router)
        self.server.add_router(auth.router)

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            product_service=ProductService(db_pool=db_pool, config=self.cfg),
            tax_rate_service=TaxRateService(db_pool=db_pool, config=self.cfg),
        )
        try:
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
