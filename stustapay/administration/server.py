import logging

from stustapay.core.config import Config
from stustapay.core.http.server import Server
from stustapay.core.subcommand import SubCommand

from .routers import products, cashiers, common, tax_rates


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
        self.server.add_router(cashiers.router)
        self.server.add_router(common.router)
        self.server.add_router(tax_rates.router)

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)

        contexts = {
            "config": self.cfg,
            "db_pool": db_pool,
        }
        try:
            await self.server.run(self.cfg, contexts)
        finally:
            await db_pool.close()
