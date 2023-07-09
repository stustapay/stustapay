from dataclasses import dataclass
from functools import wraps
from typing import (
    Optional,
    Callable,
    Awaitable,
    TypeVar,
    ParamSpec,
    Concatenate,
    Coroutine,
    Any,
    Protocol,
    Union,
    runtime_checkable,
)

import asyncpg.exceptions

from stustapay.core.schema.customer import Customer
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, CurrentUser
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.error import AccessDenied, Unauthorized


@runtime_checkable
class WithAuthService(Protocol):
    db_pool: asyncpg.Pool
    auth_service: AuthService


T = TypeVar("T")
Self = TypeVar("Self", bound=Union[WithAuthService, AuthService])
P = ParamSpec("P")


@dataclass
class DbContext:
    conn: asyncpg.Connection


@dataclass
class OptionalDbContext(DbContext):
    conn: Optional[asyncpg.Connection] = None


def with_db_connection(
    func: Callable[Concatenate[Self, Any, P], Awaitable[T]]
) -> Callable[Concatenate[Self, Any, P], Awaitable[T]]:
    @wraps(func)
    async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
        if ctx.conn:
            return await func(self, ctx, *args, **kwargs)

        async with self.db_pool.acquire() as conn:
            ctx.conn = conn
            return await func(self, ctx, *args, **kwargs)

    return wrapper


def with_db_transaction(
    func: Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]
) -> Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]:
    @wraps(func)
    async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
        if ctx.conn:
            return await func(self, ctx, *args, **kwargs)

        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                ctx.conn = conn
                return await func(self, ctx, *args, **kwargs)

    return wrapper


def with_retryable_db_transaction(n_retries=3):
    def f(
        func: Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]
    ) -> Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
            current_retries = n_retries
            if ctx.conn:
                return await func(self, ctx, *args, **kwargs)

            async with self.db_pool.acquire() as conn:
                exception = None
                while current_retries > 0:
                    try:
                        async with conn.transaction():
                            ctx.conn = conn
                            return await func(self, ctx, *args, **kwargs)
                    except asyncpg.exceptions.DeadlockDetectedError as e:
                        current_retries -= 1
                        exception = e

                if exception:
                    raise exception
                else:
                    raise RuntimeError("Unexpected error")

        return wrapper

    return f


@dataclass
class UserContext(DbContext):
    token: str
    current_user: CurrentUser


@dataclass
class OptionalUserContext:
    token: str
    conn: Optional[asyncpg.Connection] = None
    current_user: Optional[CurrentUser] = None


def requires_user(privileges: Optional[list[Privilege]] = None):
    """
    Check if a user is logged in via a user jwt token and has ALL provided privileges.
    If the current_user is already know from a previous authentication, it can be used the check the privileges
    Sets the arguments current_user in the wrapped function
    """

    def f(
        func: Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]
    ) -> Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
            if ctx.conn is None:
                raise RuntimeError(
                    "requires_user needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            if ctx.current_user is None:
                if isinstance(self, AuthService):
                    ctx.current_user = await self.get_user_from_token(ctx, token=ctx.token)
                elif isinstance(self, WithAuthService):
                    ctx.current_user = await self.auth_service.get_user_from_token(ctx, token=ctx.token)
                else:
                    raise RuntimeError("requires_user needs self.auth_service to be a AuthService instance")

            if ctx.current_user is None:
                raise Unauthorized("invalid user token")

            if privileges:
                if not any([p in privileges for p in ctx.current_user.privileges]):
                    raise AccessDenied(f"user does not have any of the required privileges: {privileges}")

            return await func(self, ctx, *args, **kwargs)

        return wrapper

    return f


@dataclass
class CustomerContext(DbContext):
    token: str
    current_customer: Customer


@dataclass
class OptionalCustomerContext:
    token: str
    conn: Optional[asyncpg.Connection] = None
    current_customer: Optional[Customer] = None


def requires_customer(
    func: Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]
) -> Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]:
    """
    Check if a customer is logged in via a customer jwt token
    If the current_customer is already know from a previous authentication, it can be used the check the privileges
    Sets the arguments current_customer in the wrapped function
    """

    @wraps(func)
    async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
        if ctx.conn is None:
            raise RuntimeError(
                "requires_customer needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )

        if ctx.current_customer is None:
            if isinstance(self, AuthService):
                ctx.current_customer = await self.get_customer_from_token(ctx, token=ctx.token)
            elif isinstance(self, WithAuthService):
                ctx.current_customer = await self.auth_service.get_customer_from_token(ctx, token=ctx.token)
            else:
                raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

        if ctx.current_customer is None:
            raise Unauthorized("invalid customer token")

        return await func(self, ctx, *args, **kwargs)

    return wrapper


@dataclass
class TerminalContext(DbContext):
    token: str
    current_terminal: Terminal
    current_user: Optional[CurrentUser] = None


@dataclass
class OptionalTerminalContext:
    token: str
    conn: Optional[asyncpg.Connection] = None
    current_terminal: Optional[Terminal] = None
    current_user: Optional[CurrentUser] = None


def requires_terminal(user_privileges: Optional[list[Privilege]] = None):
    """
    Check if a terminal is logged in via a provided terminal jwt token
    Further, if privileges are provided, checks if a user is logged in and if it has ALL provided privileges
    Sets the arguments current_terminal and current_user in the wrapped function
    """

    def f(
        func: Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]
    ) -> Callable[Concatenate[Self, Any, P], Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(self: Self, ctx: Any, *args: P.args, **kwargs: P.kwargs):
            if ctx.conn is None:
                raise RuntimeError(
                    "requires_terminal needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            if ctx.current_terminal:
                if isinstance(self, AuthService):
                    ctx.current_terminal = await self.get_terminal_from_token(ctx, token=ctx.token)
                elif isinstance(self, WithAuthService):
                    ctx.current_terminal = await self.auth_service.get_terminal_from_token(ctx, token=ctx.token)
                else:
                    raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

            if ctx.current_terminal is None:
                raise Unauthorized("invalid terminal token")

            current_user_row = await ctx.conn.fetchrow(
                "select "
                "   usr.*, "
                "   urwp.privileges as privileges, "
                "   $2::bigint as active_role_id, "
                "   urwp.name as active_role_name "
                "from usr "
                "join user_to_role utr on utr.user_id = usr.id "
                "join user_role_with_privileges urwp on urwp.id = utr.role_id "
                "where usr.id = $1 and utr.role_id = $2",
                ctx.current_terminal.till.active_user_id,
                ctx.current_terminal.till.active_user_role_id,
            )

            ctx.current_user = CurrentUser.parse_obj(current_user_row) if current_user_row is not None else None

            if user_privileges is not None:
                if ctx.current_terminal.till.active_user_id is None or ctx.current_user is None:
                    raise AccessDenied(
                        f"no user is logged into this terminal but "
                        f"the following privileges are required {user_privileges}"
                    )

                if not any([p in user_privileges for p in ctx.current_user.privileges]):
                    raise AccessDenied(f"user does not have any of the required privileges: {user_privileges}")

            return await func(self, ctx, *args, **kwargs)

        return wrapper

    return f
