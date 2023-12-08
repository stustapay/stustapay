import asyncio
import logging
import random
from functools import wraps
from inspect import Parameter, signature
from itertools import chain
from typing import Awaitable, Callable, Optional, TypeVar, overload

import asyncpg.exceptions

from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.common.error import (
    AccessDenied,
    EventRequired,
    ResourceNotAllowed,
    Unauthorized,
)
from stustapay.core.service.tree.common import fetch_node
from stustapay.framework.database import Connection

R = TypeVar("R")


def with_db_connection(func: Callable[..., Awaitable[R]]) -> Callable[..., Awaitable[R]]:
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            return await func(self, conn=conn, **kwargs)

    return wrapper


@overload
def with_db_transaction(func: Callable[..., Awaitable[R]]) -> Callable[..., Awaitable[R]]:
    """Case without arguments"""


@overload
def with_db_transaction(read_only: bool) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    """Case with arguments"""


def with_db_transaction(read_only):
    if callable(read_only):
        return with_db_isolation_transaction(read_only)
    else:

        def wrapper(func):
            return with_db_isolation_transaction(func, read_only=read_only)

        return wrapper


def with_db_isolation_transaction(func, read_only: bool = False):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            async with conn.transaction(isolation=None if read_only else "serializable"):
                return await func(self, conn=conn, **kwargs)

    return wrapper


def with_retryable_db_transaction(
    n_retries: int = 10, read_only: bool = False
) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    def f(func: Callable[..., Awaitable[R]]):
        @wraps(func)
        async def wrapper(self, **kwargs):
            current_retries = n_retries
            if "conn" in kwargs:
                return await func(self, **kwargs)

            async with self.db_pool.acquire() as conn:
                exception = None
                while current_retries > 0:
                    try:
                        async with conn.transaction(isolation=None if read_only else "serializable"):
                            return await func(self, conn=conn, **kwargs)
                    except (asyncpg.exceptions.DeadlockDetectedError, asyncpg.exceptions.SerializationError) as e:
                        current_retries -= 1
                        # random quadratic back off, with a max of 1 second
                        delay = min(random.random() * (n_retries - current_retries) ** 2 * 0.0001, 1.0)
                        if delay == 1.0:
                            logging.warning(
                                "Max waiting time in quadratic back off of one second reached,"
                                "check if there is any problem with your database transactions."
                            )
                        await asyncio.sleep(delay)

                        exception = e

                if exception:
                    raise exception
                else:
                    raise RuntimeError("Unexpected error")

        return wrapper

    return f


def requires_node(
    object_types: list[ObjectType] | None = None, event_only: bool = False
) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    """
    This makes a node_id: int parameter optional by reading it from the current users topmost node if not passed.
    """

    def f(func: Callable[..., Awaitable[R]]):
        @wraps(func)
        async def wrapper(self, **kwargs):
            # TODO: Tree node sanity checks for this logic
            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_node needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )
            conn = kwargs["conn"]

            node: Node | None = kwargs.pop("node", None)
            node_id = kwargs.pop("node_id", None)
            if node is None and node_id is None:
                raise RuntimeError("No node_id was passed as an argument. Cannot set current tree node.")

            if node is None:
                node = await fetch_node(conn=conn, node_id=node_id)
                if node is None:
                    raise RuntimeError(f"Node with id {node_id} does not exist")

            if object_types is not None:
                forbidden = list(filter(lambda obj: obj in node.computed_forbidden_objects_at_node, object_types))
                if len(forbidden) != 0:
                    raise ResourceNotAllowed(f'The resources: "{forbidden}" are not allowed at node {node.name}')
            if event_only and node.event_node_id is None:
                raise EventRequired("This operation is only allowed for nodes within events")

            if "node" in signature(func).parameters:
                kwargs["node"] = node

            return await func(self, **kwargs)

        return wrapper

    return f


def requires_user(
    privileges: list[Privilege] | None = None,
    node_required: bool = True,
) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    """
    Check if a user is logged in via a user jwt token and has ALL provided privileges.
    If the current_user is already know from a previous authentication, it can be used the check the privileges
    Sets the arguments current_user in the wrapped function
    """

    def f(func: Callable[..., Awaitable[R]]):
        original_signature = signature(func)

        @wraps(func)
        async def wrapper(self, **kwargs):
            if "token" not in kwargs and "current_user" not in kwargs:
                raise RuntimeError("token or user was not provided to service function call")

            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_user_privileges needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            token = kwargs.get("token")
            user: CurrentUser | None = kwargs.get("current_user")
            conn: Connection = kwargs["conn"]
            if user is None:
                if self.__class__.__name__ == "AuthService":
                    user = await self.get_user_from_token(conn=conn, token=token)
                elif hasattr(self, "auth_service"):
                    user = await self.auth_service.get_user_from_token(conn=conn, token=token)
                else:
                    raise RuntimeError("requires_user needs self.auth_service to be a AuthService instance")

            if user is None:
                raise Unauthorized("invalid user token")

            if node_required:
                node: Node | None = kwargs.get("node")
                if node is None:
                    raise RuntimeError("requires_user needs requires_node to be placed before it")
                role_privileges = await conn.fetch(
                    "select privileges "
                    "from user_to_role utr join user_role_with_privileges urwp on utr.role_id = urwp.id "
                    "where utr.node_id = any($1) and urwp.node_id = any($1) and utr.user_id = $2",
                    node.ids_to_root,
                    user.id,
                )
                user_privileges = set(chain.from_iterable(row["privileges"] for row in role_privileges))
                user.privileges = list(user_privileges)

                if privileges:
                    if not any([p.value in user_privileges for p in privileges]):
                        raise AccessDenied(
                            f"user does not have any of the required privileges: {[p.value for p in privileges]}"
                        )

            if "current_user" in original_signature.parameters:
                kwargs["current_user"] = user

            elif "current_user" in kwargs:
                kwargs.pop("current_user")

            if "token" not in original_signature.parameters and "token" in kwargs:
                kwargs.pop("token")

            if "conn" not in original_signature.parameters:
                kwargs.pop("conn")

            if node_required:
                if "node" not in original_signature.parameters:
                    kwargs.pop("node")

            return await func(self, **kwargs)

        if node_required and "node" not in original_signature.parameters:
            sig = signature(func)
            new_parameters = tuple(sig.parameters.values()) + (
                Parameter("node", kind=Parameter.KEYWORD_ONLY, annotation=Node),
            )
            sig = sig.replace(parameters=new_parameters)
            wrapper.__signature__ = sig  # type: ignore

        return wrapper

    return f


def requires_customer(func: Callable[..., Awaitable[R]]) -> Callable[..., Awaitable[R]]:
    """
    Check if a customer is logged in via a customer jwt token
    If the current_customer is already know from a previous authentication, it can be used the check the privileges
    Sets the arguments current_customer in the wrapped function
    """

    @wraps(func)
    async def wrapper(self, **kwargs):
        if "token" not in kwargs and "current_customer" not in kwargs:
            raise RuntimeError("token or customer was not provided to service function call")

        if "conn" not in kwargs:
            raise RuntimeError(
                "requires_customer_privileges needs a database connection, "
                "with_db_transaction needs to be put before this decorator"
            )

        token = kwargs.get("token")
        customer = kwargs.get("current_customer")
        conn = kwargs["conn"]
        if customer is None:
            if self.__class__.__name__ == "AuthService":
                customer = await self.get_customer_from_token(conn=conn, token=token)
            elif hasattr(self, "auth_service"):
                customer = await self.auth_service.get_customer_from_token(conn=conn, token=token)
            else:
                raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

        if customer is None:
            raise Unauthorized("invalid customer token")

        if "current_customer" in signature(func).parameters:
            kwargs["current_customer"] = customer
        elif "current_customer" in kwargs:
            kwargs.pop("current_customer")

        if "token" not in signature(func).parameters and "token" in kwargs:
            kwargs.pop("token")

        if "conn" not in signature(func).parameters:
            kwargs.pop("conn")

        return await func(self, **kwargs)

    return wrapper


def requires_terminal(
    user_privileges: Optional[list[Privilege]] = None,
) -> Callable[[Callable[..., Awaitable[R]]], Callable[..., Awaitable[R]]]:
    """
    Check if a terminal is logged in via a provided terminal jwt token
    Further, if privileges are provided, checks if a user is logged in and if it has ALL provided privileges
    Sets the arguments current_terminal and current_user in the wrapped function
    """

    def f(func: Callable[..., Awaitable[R]]):
        @wraps(func)
        async def wrapper(self, **kwargs):
            if "token" not in kwargs and "current_terminal" not in kwargs:
                raise RuntimeError("token was not provided to service function call")

            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_terminal needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            token = kwargs.get("token")
            terminal: Terminal | None = kwargs.get("current_terminal")
            conn = kwargs["conn"]
            if terminal is None:
                if self.__class__.__name__ == "AuthService":
                    terminal = await self.get_terminal_from_token(conn=conn, token=token)
                elif hasattr(self, "auth_service"):
                    terminal = await self.auth_service.get_terminal_from_token(conn=conn, token=token)
                else:
                    raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

            if terminal is None:
                raise Unauthorized("invalid terminal token")

            logged_in_user = await kwargs["conn"].fetch_maybe_one(
                CurrentUser,
                "select "
                "   usr.*, "
                "   urwp.privileges as privileges, "
                "   $2::bigint as active_role_id, "
                "   urwp.name as active_role_name "
                "from usr "
                "join user_to_role utr on utr.user_id = usr.id "
                "join user_role_with_privileges urwp on urwp.id = utr.role_id "
                "where usr.id = $1 and utr.role_id = $2",
                terminal.till.active_user_id,
                terminal.till.active_user_role_id,
            )

            if user_privileges is not None:
                if terminal.till.active_user_id is None or logged_in_user is None:
                    raise AccessDenied(
                        f"no user is logged into this terminal but "
                        f"the following privileges are required {user_privileges}"
                    )

                if not any([p in user_privileges for p in logged_in_user.privileges]):
                    raise AccessDenied(f"user does not have any of the required privileges: {user_privileges}")

            signature_params = signature(func).parameters

            if "current_user" in signature_params:
                kwargs["current_user"] = logged_in_user
            elif "current_user" in kwargs:
                kwargs.pop("current_user")

            if "current_terminal" in signature_params:
                kwargs["current_terminal"] = terminal
            elif "current_terminal" in kwargs:
                kwargs.pop("current_terminal")

            if "token" not in signature_params and "token" in kwargs:
                kwargs.pop("token")

            if "conn" not in signature_params:
                kwargs.pop("conn")

            if "node" in signature_params:
                node = await fetch_node(conn=conn, node_id=terminal.till.node_id)
                assert node is not None
                kwargs["node"] = node

            return await func(self, **kwargs)

        return wrapper

    return f
