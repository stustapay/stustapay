"""
handles connections with ordering terminals.
"""

import logging

import asyncpg
import uvicorn
from fastapi import FastAPI, APIRouter, Request, Depends

from .subcommand import SubCommand

router = APIRouter(
    prefix="",
    responses={404: {"description": "Not found"}},
)


def get_srv(request: Request):
    """
    get the server object from a request.
    """
    return request.state.server


@router.get("/")
async def root(srv=Depends(get_srv)):
    async with srv.dbpool.acquire() as conn:
        dbver = await conn.fetchrow("select version();")
        return {"db_version": f"{dbver[0]}"}


async def db_connect(cfg):
    """
    get a connection pool to the database
    """

    return await asyncpg.create_pool(
        user=cfg["database"]["user"],
        password=cfg["database"]["password"],
        database=cfg["database"]["dbname"],
        host=cfg["database"]["host"],
    )


class TerminalServer(SubCommand):
    """
    Talk with Terminals in the field.
    """

    def __init__(self, config, **args):
        self.cfg = config

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()
        self.api.include_router(router)

        @self.api.middleware("http")
        async def context_middleware(request: Request, call_next):
            request.state.server = self
            return await call_next(request)

        self.srvconfig = uvicorn.Config(
            self.api,
            port=config["terminalserver"]["port"],
            log_level=logging.root.level,
        )
        self.dbpool = None

    async def run(self):
        """
        connect to database and run the web server.
        """
        self.dbpool = await db_connect(self.cfg)

        webserver = uvicorn.Server(self.srvconfig)

        async with self.dbpool.acquire() as conn:
            self.logger.info("Connected to database, serving now...")
            await webserver.serve()
