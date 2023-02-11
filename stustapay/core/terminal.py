"""
handles connections with ordering terminals.
"""

import logging

from .subcommand import SubCommand
from .config import Config

from .service.transaction import TransactionService
from .http.context import Context
from .http.server import Server
from .http.router.base import router as base_router
from .http.router.live import router as live_router
from .http.router.order import router as order_router


class TerminalServer(SubCommand):
    """
    Talk with Terminals in the field.
    """

    @staticmethod
    def argparse_register(subparser):
        pass

    def __init__(self, args, config: Config, **rest):
        del args, rest

        self.cfg = config
        self.db_pool = None

        self.logger = logging.getLogger(__name__)

        self.server = Server(
            title="StuStaPay Terminal API",
            config=config.terminalserver,
            cors=True,
        )

        # endpoints available in the terminal server.
        self.server.add_router(base_router)
        self.server.add_router(live_router)
        self.server.add_router(order_router)

    async def run(self):
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
