"""
handles connections with ordering terminals.
"""

import logging

import uvicorn
from fastapi import FastAPI, APIRouter

from .http.middleware import add_context_middleware
from .subcommand import SubCommand

router = APIRouter(
    prefix="",
    responses={404: {"description": "Not found"}},
)


@router.get("/")
async def root():
    return {"message": "Yoyoyo Harry!"}


class TerminalServer(SubCommand):
    """
    Talk with Terminals in the field.
    """

    def __init__(self, config, **args):
        self.cfg = config

        self.logger = logging.getLogger(__name__)
        self.api = FastAPI()
        self.api.include_router(router)

        add_context_middleware(self.api, self.cfg)

        self.srvconfig = uvicorn.Config(self.api, port=config['terminalserver']['port'], log_level="info")

    async def run(self):
        server = uvicorn.Server(self.srvconfig)
        await server.serve()
