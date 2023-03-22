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
            await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")

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


def requires_user_privileges(privileges: Optional[list[Privilege]] = None):
    def f(func):
        @wraps(func)
        async def wrapper(self, **kwargs):
            if "token" not in kwargs:
                raise RuntimeError("token was not provided to service function call")

            if "conn" not in kwargs:
                raise RuntimeError(
                    "requires_user_privileges needs a database connection, "
                    "with_db_transaction needs to be put before this decorator"
                )

            token = kwargs["token"]
            conn = kwargs["conn"]
            if self.__class__.__name__ == "UserService":
                user = await self.get_user_from_token(conn=conn, token=token)
            elif hasattr(self, "user_service"):
                user = await self.user_service.get_user_from_token(conn=conn, token=token)
            else:
                raise RuntimeError("requires_terminal needs self.user_service to be a UserService instance")

            if user is None:
                raise PermissionError("invalid user token")  # TODO: better exception typing

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
            if self.__class__.__name__ == "TillService":
                terminal: Terminal = await self.get_terminal_from_token(conn=conn, token=token)
            elif hasattr(self, "till_service"):
                terminal: Terminal = await self.till_service.get_terminal_from_token(conn=conn, token=token)
            else:
                raise RuntimeError("requires_terminal needs self.till_service to be a TillService instance")

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
