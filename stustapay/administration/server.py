import logging

from stustapay.core.config import Config
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.config import ConfigService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.user import UserService
from stustapay.core.subcommand import SubCommand
from .routers import (
    product,
    user,
    common,
    tax_rate,
    auth,
    terminal,
    terminal_profiles,
    terminal_layouts,
    terminal_buttons,
    config as config_router,
)


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

        self.server.add_router(product.router)
        self.server.add_router(user.router)
        self.server.add_router(common.router)
        self.server.add_router(tax_rate.router)
        self.server.add_router(auth.router)
        self.server.add_router(terminal.router)
        self.server.add_router(terminal_layouts.router)
        self.server.add_router(terminal_profiles.router)
        self.server.add_router(terminal_buttons.router)
        self.server.add_router(config_router.router)

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            product_service=ProductService(db_pool=db_pool, config=self.cfg),
            tax_rate_service=TaxRateService(db_pool=db_pool, config=self.cfg),
            user_service=UserService(db_pool=db_pool, config=self.cfg),
            terminal_service=TerminalService(db_pool=db_pool, config=self.cfg),
            config_service=ConfigService(db_pool=db_pool, config=self.cfg),
        )
        try:
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
