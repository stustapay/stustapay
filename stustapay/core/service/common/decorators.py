import json
from functools import wraps
from inspect import signature
from typing import Optional

from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import User, Privilege


def with_db_connection(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            # leads to slow queries in some cases
            await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")

            return await func(self, conn=conn, **kwargs)

    return wrapper


def with_db_transaction(func):
    @wraps(func)
    async def wrapper(self, **kwargs):
        if "conn" in kwargs:
            return await func(self, **kwargs)

        async with self.db_pool.acquire() as conn:
            # leads to slow queries in some cases
            await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")

            async with conn.transaction():
                return await func(self, conn=conn, **kwargs)

    return wrapper


def requires_user_privileges(privileges: Optional[list[Privilege]] = None):
    """
    Check if a user is logged in via a user jwt token and has ALL provided privileges.
    If the current_user is already know from a previous authentication, it can be used the check the privileges
    Sets the arguments current_user in the wrapped function
    """

    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            if "token" not in kwargs and "current_user" not in kwargs:
                raise RuntimeError("token or user was not provided to service function call")

            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_user_privileges needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            token = kwargs["token"] if "token" in kwargs else None
            user = kwargs["current_user"] if "current_user" in kwargs else None
            conn = kwargs["conn"]
            if user is None:
                if self.__class__.__name__ == "AuthService":
                    user = await self.get_user_from_token(conn=conn, token=token)
                elif hasattr(self, "auth_service"):
                    user = await self.auth_service.get_user_from_token(conn=conn, token=token)
                else:
                    raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

            if user is None:
                raise PermissionError("invalid user token")  # TODO: better exception typing

            if privileges:
                for privilege in privileges:
                    if privilege not in user.privileges:
                        raise PermissionError(f"user does not have required privilege: {privilege}")

            if "current_user" in signature(func).parameters:
                kwargs["current_user"] = user
            elif "current_user" in kwargs:
                kwargs.pop("current_user")

            if "token" not in signature(func).parameters and "token" in kwargs:
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
            if "token" not in kwargs:
                raise RuntimeError("token was not provided to service function call")

            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_terminal needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            token = kwargs["token"]
            conn = kwargs["conn"]
            if self.__class__.__name__ == "AuthService":
                terminal: Terminal = await self.get_terminal_from_token(conn=conn, token=token)
            elif hasattr(self, "auth_service"):
                terminal: Terminal = await self.auth_service.get_terminal_from_token(conn=conn, token=token)
            else:
                raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

            if terminal is None:
                raise PermissionError("invalid terminal token")  # TODO: better exception typing

            if user_privileges is not None:
                if terminal.till.active_user_id is None:
                    # TODO: better exception typing
                    raise PermissionError(
                        f"no user is logged into this terminal but "
                        f"the following privileges are required {user_privileges}"
                    )

                logged_in_user = User.parse_obj(
                    await kwargs["conn"].fetchrow(
                        "select * from usr_with_privileges where id = $1", terminal.till.active_user_id
                    )
                )

                for privilege in user_privileges:
                    if privilege not in logged_in_user.privileges:
                        raise PermissionError(f"user does not have required privilege: {privilege}")

                if "current_user" in signature(func).parameters:
                    kwargs["current_user"] = logged_in_user

            if "current_terminal" in signature(func).parameters:
                kwargs["current_terminal"] = terminal

            if "token" not in signature(func).parameters:
                kwargs.pop("token")

            return await func(self, **kwargs)

        return wrapper

    return f
