"""
handles connections with ordering terminals.
"""

import logging

from .subcommand import SubCommand
from .config import Config

from .service.transaction import TransactionService
from .http.context import Context
from .http.server import Server
from .http.router import base, live, order, auth

from .http.router_mock.base import router as mock_base_router


class TerminalServer(SubCommand):
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
                transaction_service=None,
            )

            await self.server.run(self.cfg, context)
            return

        db_pool = await self.server.db_connect(self.cfg.database)

        context = Context(
            config=self.cfg,
            db_pool=db_pool,
            transaction_service=TransactionService(db_pool=db_pool, config=self.cfg),
        )
        try:
            await self.server.run(self.cfg, context)
        finally:
            await db_pool.close()
