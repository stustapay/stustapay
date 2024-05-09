"""
handles connections with ordering terminals.
"""

import asyncio
import json
import logging

from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.account import AccountService
from stustapay.core.service.auth import AuthService
from stustapay.core.service.order import OrderService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.terminalserver.router import (
    auth,
    base,
    cashier,
    customer,
    management,
    order,
    user,
)


def get_server(config: Config):
    server = Server(
        title="StuStaPay Terminal API",
        config=config.terminalserver,
        cors=True,
    )

    # endpoints available in the terminal server.
    server.add_router(base.router)
    server.add_router(order.router)
    server.add_router(auth.router)
    server.add_router(user.router)
    server.add_router(customer.router)
    server.add_router(cashier.router)
    server.add_router(management.router)
    return server


def print_openapi(config: Config):
    server = get_server(config)
    print(json.dumps(server.get_openapi_spec()))


class Api:
    """
    Talk with Terminals in the field.
    """

    def __init__(self, config: Config):
        self.cfg = config
        self.db_pool = None

        self.logger = logging.getLogger(__name__)
        self.server = get_server(config)

    async def run(self):
        db_pool = await self.server.db_connect(self.cfg.database)
        await database.check_revision_version(db_pool)

        auth_service = AuthService(db_pool=db_pool, config=self.cfg)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            order_service=OrderService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            user_service=UserService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            till_service=TillService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            account_service=AccountService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
            terminal_service=TerminalService(db_pool=db_pool, config=self.cfg, auth_service=auth_service),
        )
        try:
            self.server.add_task(asyncio.create_task(run_healthcheck(db_pool=db_pool, service_name="terminalserver")))
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
