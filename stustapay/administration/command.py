import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from stustapay.core.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.http.middleware import ContextMiddleware
from stustapay.core.subcommand import SubCommand
from .routers import products, cashiers, common, tax_rates


class Api(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config: Config, **args):
        del args  # unused

        self.cfg = config
        self.dbpool = None

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()

        self.api.include_router(products.router)
        self.api.include_router(cashiers.router)
        self.api.include_router(common.router)
        self.api.include_router(tax_rates.router)
        self.api.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

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
        self.api.add_middleware(ContextMiddleware, config=self.cfg, db_pool=self.dbpool)
        webserver = uvicorn.Server(self.srvconfig)
        await webserver.serve()
