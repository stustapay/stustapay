import asyncio
import json
import logging

from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.account import AccountService
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import AuthService, UserService
from stustapay.core.service.user_tag import UserTagService

from ..core.service.sumup import SumUpService
from .routers import account, auth, cashier
from .routers import config as config_router
from .routers import (
    customer,
    order,
    payout,
    product,
    stats,
    sumup,
    tax_rate,
    ticket,
    till,
    till_button,
    till_layout,
    till_profile,
    till_register_stockings,
    till_registers,
    tree,
    tse,
    user,
    user_tag,
)


def get_server(config: Config):
    server = Server(
        title="StuStaPay Administration API",
        config=config.administration,
        cors=True,
    )

    server.add_router(product.router)
    server.add_router(user.router)
    server.add_router(tax_rate.router)
    server.add_router(auth.router)
    server.add_router(till.router)
    server.add_router(till_layout.router)
    server.add_router(till_profile.router)
    server.add_router(till_button.router)
    server.add_router(till_register_stockings.router)
    server.add_router(till_registers.router)
    server.add_router(config_router.router)
    server.add_router(account.router)
    server.add_router(order.router)
    server.add_router(cashier.router)
    server.add_router(stats.router)
    server.add_router(ticket.router)
    server.add_router(user_tag.router)
    server.add_router(tse.router)
    server.add_router(payout.router)
    server.add_router(tree.router)
    server.add_router(sumup.router)
    server.add_router(customer.router)
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
        product_service = ProductService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        till_service = TillService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        order_service = OrderService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        config_service = ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            product_service=product_service,
            tax_rate_service=TaxRateService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            user_service=UserService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            till_service=till_service,
            config_service=config_service,
            account_service=AccountService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            cashier_service=CashierService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            order_service=order_service,
            ticket_service=TicketService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            user_tag_service=UserTagService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            tse_service=TseService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            tree_service=TreeService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            customer_service=CustomerService(
                db_pool=db_pool, config=self.cfg, auth_service=auth_service, config_service=config_service
            ),
            sumup_service=SumUpService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
        )
        try:
            self.server.add_task(asyncio.create_task(run_healthcheck(db_pool=db_pool, service_name="administration")))
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
