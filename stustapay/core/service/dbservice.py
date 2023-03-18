"""
database interaction
"""

import json
from abc import ABC
from functools import wraps
from inspect import signature
from typing import Optional, Tuple

from asyncpg.pool import Pool

from stustapay.core.config import Config
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import User, Privilege


def with_db_connection(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            return await func(self, conn=conn, **kwargs)

    return wrapper


def with_db_transaction(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")

            async with conn.transaction():
                return await func(self, conn=conn, **kwargs)

    return wrapper


async def _get_user_and_terminal(self, **kwargs) -> Tuple[Optional[User], Optional[Terminal]]:
    """
    find the current user or terminal (and its user) using the provided token and the user/till_service
    """
    if "token" not in kwargs:
        raise RuntimeError("token was not provided to service function call")

    if "conn" not in kwargs:
        raise RuntimeError(
            "requires_xxxx needs a database connection, with_db_transaction needs to be put before this decorator"
        )

    token = kwargs["token"]
    conn = kwargs["conn"]
    user: Optional[User] = None
    terminal: Optional[Terminal] = None

    if self.__class__.__name__ == "UserService":
        user = await self.get_user_from_token(conn=conn, token=token)
    elif hasattr(self, "user_service"):
        user = await self.user_service.get_user_from_token(conn=conn, token=token)
    if self.__class__.__name__ == "TillService":
        terminal = await self.get_terminal_from_token(conn=conn, token=token)
    elif hasattr(self, "till_service"):
        terminal = await self.till_service.get_terminal_from_token(conn=conn, token=token)

    # either User or Terminal can be set, as a token would be correct for either one
    if user is not None and terminal is not None:
        raise Exception("This should not happen, a jwt token matched for a user and terminal")

    if terminal is not None and terminal.till.active_user_id is not None:
        # TODO, maybe it is better to use a user_service, but we cannot be sure if one exists for tills
        user = User.parse_obj(
            await conn.fetchrow("select * from usr_with_privileges where id = $1", terminal.till.active_user_id)
        )

    # privileges are not checked here, as it may be enough if a terminal is logged in
    # and no exakt privileges are required. So it is okay for the User to be None
    return user, terminal


def requires_user_privileges(privileges: Optional[list[Privilege]] = None):
    """
    Check if a user is logged in via a user jwt token and has ALL provided privileges
    Sets the arguments current_user in the wrapped function
    """

    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            user, terminal = await _get_user_and_terminal(self, **kwargs)
            if user is None or terminal is not None:
                raise PermissionError("No authenticated User found")

            if privileges:
                for privilege in privileges:
                    if privilege not in user.privileges:
                        raise PermissionError(f"user does not have required privilege: {privilege}")

            if "current_user" in signature(func).parameters:
                kwargs["current_user"] = user
            if "token" not in signature(func).parameters:
                kwargs.pop("token")

            return await func(self, **kwargs)

        return wrapper

    return f


def requires_terminal(user_privileges: Optional[list[Privilege]] = None):
    """
    Check if a terminal is logged in via a provided terminal jwt token
    Further, if privileges are provided, checks if a user is logged in and if it has ALL provided privileges
    Sets the arguments current_terminal and current_user in the wrapped function
    """

    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            user, terminal = await _get_user_and_terminal(self, **kwargs)
            if terminal is None:
                raise PermissionError("No authenticated Terminal found")

            if user_privileges is not None:
                for privilege in user_privileges:
                    if privilege not in user.privileges:
                        raise PermissionError(f"user does not have required privilege: {privilege}")

                if "current_user" in signature(func).parameters:
                    kwargs["current_user"] = user

            if "current_terminal" in signature(func).parameters:
                kwargs["current_terminal"] = terminal
            if "token" not in signature(func).parameters:
                kwargs.pop("token")

            return await func(self, **kwargs)

        return wrapper

    return f


def requires_terminal_or_user(privileges: Optional[list[Privilege]] = None):
    """
    Check if a user or terminal is logged in via a user or terminal jwt token
    Checks if the logged-in user or the user of the terminal and has ALL provided privileges
    Sets the arguments current_user in the wrapped function
    """

    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            user, _ = await _get_user_and_terminal(self, **kwargs)
            # now the user can be the terminal user or a usual logged-in user, as long as one exists it is fine
            if user is None:
                raise PermissionError("No authenticated User found")

            if privileges:
                for privilege in privileges:
                    if privilege not in user.privileges:
                        raise PermissionError(f"user does not have required privilege: {privilege}")

            if "current_user" in signature(func).parameters:
                kwargs["current_user"] = user
            if "token" not in signature(func).parameters:
                kwargs.pop("token")

            return await func(self, **kwargs)

        return wrapper

    return f


class DBService(ABC):
    """
    base class for all database interaction
    """

    def __init__(self, db_pool: Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config
