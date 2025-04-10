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
from stustapay.core.service.account import AccountService
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.mail import MailService
from stustapay.core.service.media import MediaService
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.sumup import SumUpService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import AuthService, UserService
from stustapay.core.service.user_tag import UserTagService
from stustapay.core.service.webhook import WebhookService

from .routers import (
    account,
    auth,
    cashier,
    customer,
    media,
    order,
    payout,
    product,
    stats,
    sumup,
    tax_rate,
    terminal,
    ticket,
    till,
    till_button,
    till_layout,
    till_profile,
    till_register_stockings,
    till_registers,
    transaction,
    tree,
    tse,
    user,
    user_tag,
    webhooks,
)
from .routers import config as config_router


def get_server(config: Config):
    server = Server(
        title="StuStaPay Administration API",
        config=config.administration,
        license_name="AGPL-3.0",
        version=__version__,
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
    server.add_router(terminal.router)
    server.add_router(transaction.router)
    server.add_router(webhooks.router)
    server.add_router(media.router)
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
        db = get_database(config=self.cfg.database)
        db_pool = await db.create_pool()
        await database.check_revision_version(db)

        auth_service = AuthService(db_pool=db_pool, config=self.cfg)
        product_service = ProductService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        till_service = TillService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        order_service = OrderService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        config_service = ConfigService(db_pool=db_pool, config=self.cfg, auth_service=auth_service)
        mail_service = MailService(db_pool=db_pool, config=self.cfg)

        context = Context(
            config=self.cfg,
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
            terminal_service=TerminalService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            webhook_service=WebhookService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            media_service=MediaService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            mail_service=mail_service,
        )
        try:
            self.server.add_task(asyncio.create_task(run_healthcheck(db, service_name="administration")))
            self.server.add_task(asyncio.create_task(mail_service.run_mail_service()))
            await self.server.run(context)
        finally:
            await db_pool.close()
