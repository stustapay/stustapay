"""
http server base class
"""

import logging
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .context import Context, ContextMiddleware
from ..database import create_db_pool
from ..config import DatabaseConfig, HTTPServerConfig
from ... import __version__


class Server:
    def __init__(self, title: str, config: HTTPServerConfig, cors: bool = False):
        self.api = FastAPI(
            title=title,
            version=__version__,
            license_info={"name": "AGPL-3.0"},
        )

        if cors:
            self.api.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )

        self.uvicorn_config = uvicorn.Config(
            self.api,
            host=config.host,
            port=config.port,
            log_level=logging.root.level,
        )

    def add_router(self, router):
        self.api.include_router(router)

    async def db_connect(self, cfg: DatabaseConfig):
        return await create_db_pool(cfg)

    async def run(self, cfg, context: Context):
        del cfg

        # register service instances so they are available in api routes
        # kwargs set here can then be fetched with `name = Depends($name)`
        # in the router kwargs.
        self.api.add_middleware(
            ContextMiddleware,
            context=context,
        )

        webserver = uvicorn.Server(self.uvicorn_config)
        await webserver.serve()
