"""
handles connections with ordering terminals.
"""

import logging

import uvicorn
from fastapi import FastAPI, APIRouter, Request, Depends

from .database import create_db_pool
from .http.dependencies import get_db_conn
from .http.middleware import add_context_middleware
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
async def root(conn=Depends(get_db_conn)):
    dbver = await conn.fetchrow("select version();")
    return {"db_version": f"{dbver[0]}"}


class TerminalServer(SubCommand):
    """
    Talk with Terminals in the field.
    """

    def __init__(self, config, **args):
        self.cfg = config

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()
        self.api.include_router(router)
        self.dbpool = None

        self.srvconfig = uvicorn.Config(
            self.api,
            host=config.terminalserver.host,
            port=config.terminalserver.port,
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
