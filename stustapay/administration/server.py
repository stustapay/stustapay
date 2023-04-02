import asyncio
import logging

from stustapay.core.config import Config
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.account import AccountService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import AuthService, UserService
from stustapay.core.subcommand import SubCommand
from .routers import (
    account,
    auth,
    config as config_router,
    order,
    product,
    tax_rate,
    till,
    till_button,
    till_layout,
    till_profile,
    user,
    endpoints,
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
        self.server.add_router(tax_rate.router)
        self.server.add_router(auth.router)
        self.server.add_router(till.router)
        self.server.add_router(till_layout.router)
        self.server.add_router(till_profile.router)
        self.server.add_router(till_button.router)
        self.server.add_router(config_router.router)
        self.server.add_router(account.router)
        self.server.add_router(order.router)
        self.server.add_router(endpoints.router)

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)

        auth_service = AuthService(db_pool=db_pool, config=self.cfg)
        order_service = OrderService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            product_service=ProductService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            tax_rate_service=TaxRateService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            user_service=UserService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            till_service=TillService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            config_service=ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            account_service=AccountService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            order_service=order_service,
        )
        try:
            await asyncio.gather(self.server.run(self.cfg, context), order_service.run())
        finally:
            await db_pool.close()
