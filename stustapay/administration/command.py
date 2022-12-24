import logging

import uvicorn
from fastapi import FastAPI

from stustapay.core.database import create_db_pool
from stustapay.core.http.middleware import add_context_middleware
from stustapay.core.subcommand import SubCommand
from .routers import products, cashiers, common
from ..core.config import Config


class Api(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config: Config, **args):
        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()

        self.api.include_router(products.router)
        self.api.include_router(cashiers.router)
        self.api.include_router(common.router)

        self.srvconfig = uvicorn.Config(
            self.api,
            host=config.administration.host,
            port=config.administration.port,
            log_level=logging.root.level,
        )

    async def run(self):
        """
        connect to database and run the web server.
        """
        self.dbpool = await create_db_pool(self.cfg)
        add_context_middleware(self.api, self.cfg, self.dbpool)
        webserver = uvicorn.Server(self.srvconfig)
        await webserver.serve()
