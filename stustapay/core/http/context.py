"""
context injection for the http-api with FastAPI.
"""

from argparse import Namespace
from typing import Union, AsyncGenerator

import asyncpg
from fastapi import Request, Depends, WebSocket
from starlette.types import ASGIApp, Scope, Receive, Send


class Context(Namespace):
    """
    provides access to data injected by the ContextMiddleware
    into each request.
    """


class ContextMiddleware:
    """
    FastAPI middleware to make any variable available in a request.
    Works through ASGI magic: https://www.starlette.io/middleware/

    # Usage:
    from fastapi import FastAPI, Request, Depends
    api = FastAPI()
    api.add_middleware(ContextMiddleware,
                       db_pool=asyncpg.create_pool(...)
                       example_query="select version();"
                       example_value="rolf")

    # define dependency extractor
    def get_context(request: Request) -> Any:
        return request.state.context

    def get_db_pool(request: Request) -> asyncpg.Pool:
        return request.state.context.db_pool

    async def get_db_conn(
        db_pool: asyncpg.Pool = Depends(get_db_pool),
    ) -> asyncpg.Connection:
    async with db_pool.acquire() as conn:
        yield conn

    # in the request:
    @router.get("/dbversion")
    async def dbver(req: Request,
                    conn=Depends(get_db_conn),
                    ctx=Depends(get_context)):
        query = req.state.context.example_query
        # another way:
        # example_value == ctx.example_value
        dbver = await conn.fetchrow(query)
        return {"db_version": f"{dbver[0]}"}
    """

    def __init__(
        self,
        app: ASGIApp,
        **kwargs,
    ) -> None:
        self._app = app

        # store whatever else we need in request handling
        self.state = Context(**kwargs)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # build the request object that is available in the request handler
        # it magically gets passed through the "scope" parameter...
        # https://www.starlette.io/middleware/
        if scope["type"] == "http":
            req: Union[Request, WebSocket] = Request(scope, receive, send)
        elif scope["type"] == "websocket":
            req = WebSocket(scope, receive, send)
        else:
            return await self._app(scope, receive, send)

        # add links in the request.state to our shared members
        req.state.context = self.state

        await self._app(scope, receive, send)


def get_context(request: Request):
    return request.state.context


def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.state.context.db_pool


async def get_db_conn(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
) -> AsyncGenerator[Union[asyncpg.Connection, asyncpg.pool.PoolConnectionProxy], None]:
    async with db_pool.acquire() as conn:
        yield conn
