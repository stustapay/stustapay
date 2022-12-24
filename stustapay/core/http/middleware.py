import asyncpg
from fastapi import FastAPI, Request

from stustapay.core.config import Config


def add_context_middleware(app: FastAPI, config: Config, db_pool: asyncpg.Pool):
    @app.middleware("http")
    async def context_middleware(request: Request, call_next):
        request.state.config = config
        request.state.db_pool = db_pool
        return await call_next(request)
