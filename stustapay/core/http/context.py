"""
context injection for the http-api with FastAPI.
"""

from dataclasses import dataclass
from typing import Annotated, AsyncGenerator, Optional, Union

import asyncpg
from fastapi import Depends, Request, WebSocket
from starlette.types import ASGIApp, Receive, Scope, Send

from stustapay.core.config import Config
from stustapay.core.service.account import AccountService
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.sumup import SumUpService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import UserTagService
from stustapay.framework.database import Connection


@dataclass
class Context:
    """
    provides access to data injected by the ContextMiddleware
    into each request.
    """

    db_pool: asyncpg.Pool
    config: Config
    order_service: Optional[OrderService] = None
    product_service: Optional[ProductService] = None
    tax_rate_service: Optional[TaxRateService] = None
    user_service: Optional[UserService] = None
    customer_service: Optional[CustomerService] = None
    till_service: Optional[TillService] = None
    config_service: Optional[ConfigService] = None
    account_service: Optional[AccountService] = None
    cashier_service: Optional[CashierService] = None
    ticket_service: Optional[TicketService] = None
    user_tag_service: Optional[UserTagService] = None
    tse_service: Optional[TseService] = None
    tree_service: Optional[TreeService] = None
    sumup_service: Optional[SumUpService] = None


class ContextMiddleware:
    """
    FastAPI middleware to make any variable available in a request.
    Works through ASGI magic: https://www.starlette.io/middleware/

    # Usage:
    from fastapi import FastAPI, Request, Depends
    api = FastAPI()
    context = Context(...)
    api.add_middleware(ContextMiddleware,
                       context=context,
                       example_query="select version();")

    # define dependency extractor
    def get_context(request: Request) -> Any:
        return request.state.context

    def get_db_pool(request: Request) -> asyncpg.Pool:
        return request.state.context.db_pool

    async def get_db_conn(
        db_pool: asyncpg.Pool = Depends(get_db_pool),
    ) -> Connection:
    async with db_pool.acquire() as conn:
        yield conn

    # in the request:
    @router.get("/dbversion")
    async def dbver(req: Request,
                    conn=Depends(get_db_conn),
                    ctx=Depends(get_context)):
        query = req.state.args.example_query
        # another way:
        # example_value == ctx.example_value
        dbver = await conn.fetchrow(query)
        return {"db_version": f"{dbver[0]}"}
    """

    def __init__(
        self,
        app: ASGIApp,
        context: Context,
        **args,
    ) -> None:
        self._app = app

        # store whatever else we need in request handling
        self.context = context
        self.args = args

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
        req.state.context = self.context
        req.state.args = self.args

        await self._app(scope, receive, send)


def get_context(request: Request):
    return request.state.context


def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.state.context.db_pool


def get_order_service(request: Request) -> OrderService:
    return request.state.context.order_service


def get_product_service(request: Request) -> ProductService:
    return request.state.context.product_service


def get_tax_rate_service(request: Request) -> TaxRateService:
    return request.state.context.tax_rate_service


def get_user_service(request: Request) -> UserService:
    return request.state.context.user_service


def get_customer_service(request: Request) -> CustomerService:
    return request.state.context.customer_service


def get_till_service(request: Request) -> TillService:
    return request.state.context.till_service


def get_config_service(request: Request) -> ConfigService:
    return request.state.context.config_service


def get_account_service(request: Request) -> AccountService:
    return request.state.context.account_service


def get_cashier_service(request: Request) -> CashierService:
    return request.state.context.cashier_service


def get_ticket_service(request: Request) -> TicketService:
    return request.state.context.ticket_service


def get_user_tag_service(request: Request) -> UserService:
    return request.state.context.user_tag_service


def get_tse_service(request: Request) -> TseService:
    return request.state.context.tse_service


def get_tree_service(request: Request) -> TreeService:
    return request.state.context.tree_service


def get_sumup_service(request: Request) -> SumUpService:
    return request.state.context.sumup_service


ContextOrderService = Annotated[OrderService, Depends(get_order_service)]
ContextProductService = Annotated[ProductService, Depends(get_product_service)]
ContextTaxRateService = Annotated[TaxRateService, Depends(get_tax_rate_service)]
ContextUserService = Annotated[UserService, Depends(get_user_service)]
ContextCustomerService = Annotated[CustomerService, Depends(get_customer_service)]
ContextTillService = Annotated[TillService, Depends(get_till_service)]
ContextConfigService = Annotated[ConfigService, Depends(get_config_service)]
ContextAccountService = Annotated[AccountService, Depends(get_account_service)]
ContextUserTagService = Annotated[UserTagService, Depends(get_user_tag_service)]
ContextCashierService = Annotated[CashierService, Depends(get_cashier_service)]
ContextTicketService = Annotated[TicketService, Depends(get_ticket_service)]
ContextTseService = Annotated[TseService, Depends(get_tse_service)]
ContextTreeService = Annotated[TreeService, Depends(get_tree_service)]
ContextSumUpService = Annotated[SumUpService, Depends(get_sumup_service)]


async def get_db_conn(
    db_pool: asyncpg.Pool = Depends(get_db_pool),
) -> AsyncGenerator[Union[Connection, asyncpg.pool.PoolConnectionProxy], None]:
    async with db_pool.acquire() as conn:
        yield conn
