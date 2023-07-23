"""
http server base class
"""
import asyncio
import logging
from urllib.parse import urlparse

import asyncpg
import uvicorn
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from stustapay import __version__
from stustapay.core.config import DatabaseConfig, HTTPServerConfig
from stustapay.core.database import create_db_pool
from stustapay.core.http.context import Context, ContextMiddleware
from stustapay.core.http.error import (
    access_exception_handler,
    bad_request_exception_handler,
    exception_handler,
    not_found_exception_handler,
    service_exception_handler,
    unauthorized_exception_handler,
)
from stustapay.core.service.common.error import (
    AccessDenied,
    NotFound,
    ServiceException,
    Unauthorized,
)


def use_route_names_as_operation_ids(app: FastAPI) -> None:
    """
    Simplify operation IDs so that generated API clients have simpler function
    names.

    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name


class Server:
    def __init__(self, title: str, config: HTTPServerConfig, cors: bool = False):
        parsed_base_url = urlparse(config.base_url)
        root_path = parsed_base_url.path
        self.api = FastAPI(
            title=title,
            version=__version__,
            license_info={"name": "AGPL-3.0"},
            root_path=root_path,
        )

        self.api.add_exception_handler(NotFound, not_found_exception_handler)
        self.api.add_exception_handler(ServiceException, service_exception_handler)
        self.api.add_exception_handler(AccessDenied, access_exception_handler)
        self.api.add_exception_handler(Unauthorized, unauthorized_exception_handler)
        self.api.add_exception_handler(
            asyncpg.exceptions.IntegrityConstraintViolationError, bad_request_exception_handler
        )
        self.api.add_exception_handler(asyncpg.exceptions.RaiseError, bad_request_exception_handler)
        self.api.add_exception_handler(Exception, exception_handler)

        if cors:
            self.api.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )

        forward_allowed_ips = None

        # TODO: IPv6
        if config.host == "localhost" or config.host.startswith("127."):
            forward_allowed_ips = "*"

        self.tasks: list[asyncio.Task] = []

        self.uvicorn_config = uvicorn.Config(
            self.api,
            host=config.host,
            port=config.port,
            log_level=logging.root.level,
            forwarded_allow_ips=forward_allowed_ips,
        )

    def add_router(self, router: APIRouter):
        self.api.include_router(router)
        use_route_names_as_operation_ids(self.api)

    def add_task(self, task: asyncio.Task):
        self.tasks.append(task)

    def get_openapi_spec(self) -> dict:
        return self.api.openapi()

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

        for task in self.tasks:
            task.cancel()
