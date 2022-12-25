import asyncpg
from starlette.requests import Request
from starlette.types import ASGIApp, Scope, Receive, Send

from stustapay.core.config import Config


class ContextMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        config: Config,
        db_pool: asyncpg.Pool,
    ) -> None:
        self.app = app

        self.config = config
        self.db_pool = db_pool

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        request = Request(scope, receive)
        request.state.config = self.config
        request.state.db_pool = self.db_pool

        await self.app(scope, receive, send)
