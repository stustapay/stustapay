"""
handles connections with ordering terminals.
"""

import logging

from stustapay.core.config import Config
from stustapay.core.http.context import Context
from stustapay.core.http.server import Server
from stustapay.core.service.order import OrderService
from stustapay.core.subcommand import SubCommand
from stustapay.terminalserver.router import auth, base, live, order
from stustapay.terminalserver.router_mock.base import router as mock_base_router


class Api(SubCommand):
    """
    Talk with Terminals in the field.
    """

    @staticmethod
    def argparse_register(subparser):
        pass

    def __init__(self, args, config: Config, **rest):
        del rest

        self.cfg = config
        self.mock = args.mock
        self.db_pool = None

        self.logger = logging.getLogger(__name__)

        self.server = Server(
            title="StuStaPay Terminal API",
            config=config.terminalserver,
            cors=True,
        )

        # endpoints available in the terminal server.
        if self.mock:
            self.server.add_router(mock_base_router)
        else:
            self.server.add_router(base.router)
            self.server.add_router(live.router)
            self.server.add_router(order.router)
            self.server.add_router(auth.router)

    async def run(self):
        if self.mock:
            context = Context(
                config=self.cfg,
                db_pool=None,
                order_service=None,
            )

            await self.server.run(self.cfg, context)
            return

        db_pool = await self.server.db_connect(self.cfg.database)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            order_service=OrderService(db_pool=db_pool, config=self.cfg),
        )
        try:
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
