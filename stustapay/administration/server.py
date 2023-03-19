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
from stustapay.core.service.user import UserService
from stustapay.core.subcommand import SubCommand
from .routers import (
    product,
    user,
    tax_rate,
    auth,
    till,
    till_profile,
    till_layout,
    till_button,
    config as config_router,
    account,
    order,
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

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)

        user_service = UserService(db_pool=db_pool, config=self.cfg)
        till_service = TillService(db_pool=db_pool, config=self.cfg, user_service=user_service)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            product_service=ProductService(db_pool=db_pool, config=self.cfg, user_service=user_service),
            tax_rate_service=TaxRateService(db_pool=db_pool, config=self.cfg, user_service=user_service),
            user_service=user_service,
            till_service=till_service,
            config_service=ConfigService(db_pool=db_pool, config=self.cfg, user_service=user_service),
            account_service=AccountService(db_pool=db_pool, config=self.cfg, user_service=user_service),
            order_service=OrderService(
                db_pool=db_pool, config=self.cfg, user_service=user_service, till_service=till_service
            ),
        )
        try:
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
