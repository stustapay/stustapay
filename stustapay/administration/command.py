import logging

import uvicorn
from fastapi import FastAPI

from stustapay.core.subcommand import SubCommand
from stustapay.core.http.middleware import add_context_middleware
from .routers import products, cashiers, common


class Api(SubCommand):
    """
    sft psql websocket gateway
    """

    def __init__(self, config, **args):
        self.cfg = config

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()

        self.api.include_router(products.router)
        self.api.include_router(cashiers.router)
        self.api.include_router(common.router)

        add_context_middleware(self.api, self.cfg)

        self.srvconfig = uvicorn.Config(
            self.api,
            host=config["administration"]["host"],
            port=int(config["administration"]["port"]),
            log_level="info",
        )

    def run(self):
        """
        run the http server
        """
        logging.warning(
            "This is a development api server, please do not run this in production"
        )
        server = uvicorn.Server(self.srvconfig)
        server.run()
