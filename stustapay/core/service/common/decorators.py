from functools import wraps
from inspect import Parameter, signature
from typing import Awaitable, Callable, Optional, TypeVar

from sftkit.database import Connection

from stustapay.core.schema.terminal import CurrentTerminal
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import (
    CurrentUser,
    EventPrivilege,
    NodePrivilege,
)
from stustapay.core.service.common.error import (
    AccessDenied,
    EventRequired,
    InvalidArgument,
    NodeIsReadOnly,
    ResourceNotAllowed,
    Unauthorized,
)
from stustapay.core.service.tree.common import fetch_event_node_for_node, fetch_node

R = TypeVar("R")


_READONLY_KWARG_NAME = "__read_only__"


def _is_func_read_only(kwargs, func):
    is_readonly = kwargs.get(_READONLY_KWARG_NAME, False)
    if _READONLY_KWARG_NAME not in signature(func).parameters:
        kwargs.pop(_READONLY_KWARG_NAME)

    return is_readonly


def _add_readonly_to_kwargs(read_only: bool, kwargs, func):
    if _READONLY_KWARG_NAME in signature(func).parameters:
        kwargs[_READONLY_KWARG_NAME] = read_only


def _add_arg_to_signature(original_func, new_func, name: str):
    sig = signature(original_func)
    new_parameters = tuple(sig.parameters.values()) + (Parameter(name, kind=Parameter.KEYWORD_ONLY, annotation=Node),)
    sig = sig.replace(parameters=new_parameters)
    new_func.__signature__ = sig  # type: ignore


def _parse_event_privileges(names: list[str]) -> list[EventPrivilege]:
    return [EventPrivilege(name) for name in names]


def _parse_node_privileges(names: list[str]) -> list[NodePrivilege]:
    return [NodePrivilege(name) for name in names]


async def _fetch_user_privileges_at_node(
    conn: Connection, *, user_id: int, node_id: int
) -> tuple[list[EventPrivilege], list[NodePrivilege]]:
    row = await conn.fetchrow(
        "select event_privileges_at_node, node_privileges_at_node from user_privileges_at_node($1) where node_id = $2",
        user_id,
        node_id,
    )
    if row is None:
        return [], []
    return _parse_event_privileges(row["event_privileges_at_node"]), _parse_node_privileges(
        row["node_privileges_at_node"]
    )


async def _fetch_terminal_user_privileges(
    conn: Connection, *, user_id: int, role_id: int, till_node_id: int | None
) -> tuple[list[EventPrivilege], list[NodePrivilege]]:
    row = await conn.fetchrow(
        "select event_privileges, node_privileges from terminal_user_privileges($1, $2, $3)",
        user_id,
        role_id,
        till_node_id,
    )
    if row is None:
        return [], []
    return _parse_event_privileges(row["event_privileges"]), _parse_node_privileges(row["node_privileges"])


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

            func_is_read_only = _is_func_read_only(kwargs, func)
            if not func_is_read_only and node.read_only:
                raise NodeIsReadOnly(f"{node.name} is read only")

            if object_types is not None:
                forbidden = list(filter(lambda obj: obj in node.computed_forbidden_objects_at_node, object_types))
                if len(forbidden) != 0:
                    raise ResourceNotAllowed(
                        f'The resources: "{", ".join(map(lambda x: x.value, forbidden))}" are not allowed at node {node.name}'
                    )
            if event_only and node.event_node_id is None:
                raise EventRequired("This operation is only allowed for nodes within events")

            if "node" in signature(func).parameters:
                kwargs["node"] = node

            return await func(self, **kwargs)

        _add_arg_to_signature(func, wrapper, _READONLY_KWARG_NAME)

        return wrapper

    return f


def requires_user(
    *,
    event_privileges: list[EventPrivilege] | None = None,
    node_privileges: list[NodePrivilege] | None = None,
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
                user_event_privileges, user_node_privileges = await _fetch_user_privileges_at_node(
                    conn, user_id=user.id, node_id=node.id
                )
                user.event_privileges = user_event_privileges
                user.node_privileges = user_node_privileges

                if event_privileges:
                    if not any(p in user.event_privileges for p in event_privileges):
                        raise AccessDenied(
                            f"user does not have any of the required event privileges: {[p.value for p in event_privileges]}"
                        )
                if node_privileges:
                    if not any(p in user.node_privileges for p in node_privileges):
                        raise AccessDenied(
                            f"user does not have any of the required node privileges: {[p.value for p in node_privileges]}"
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
            _add_arg_to_signature(func, wrapper, "node")

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
            raise Unauthorized("invalid login - please log in again")

        node_is_readonly = await conn.fetchval(
            "select read_only from node n join account a on a.node_id = n.id where a.id = $1", customer.id
        )
        if node_is_readonly:
            raise Unauthorized("The event is over - please log in again ")

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
    *,
    event_privileges: Optional[list[EventPrivilege]] = None,
    node_privileges: Optional[list[NodePrivilege]] = None,
    requires_till=True,
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
            terminal: CurrentTerminal | None = kwargs.get("current_terminal")
            conn: Connection = kwargs["conn"]
            if terminal is None:
                if self.__class__.__name__ == "AuthService":
                    terminal = await self.get_terminal_from_token(conn=conn, token=token)
                elif hasattr(self, "auth_service"):
                    terminal = await self.auth_service.get_terminal_from_token(conn=conn, token=token)
                else:
                    raise RuntimeError("requires_terminal needs self.auth_service to be a AuthService instance")

            if terminal is None:
                raise Unauthorized("invalid terminal token")

            await conn.execute("update terminal set last_seen = now() where id = $1", terminal.id)

            till = await conn.fetch_maybe_one(
                Till,
                "select * from till_with_cash_register where terminal_id = $1",
                terminal.id,
            )
            if till is None and requires_till:
                raise Unauthorized("Terminal does not have an assigned till but one is required")

            signature_params = signature(func).parameters
            func_is_read_only = _is_func_read_only(kwargs, func)

            event_node = await fetch_event_node_for_node(conn=conn, node_id=terminal.node_id)
            if event_node is None:
                raise InvalidArgument("Terminals should not be able to be created outside of events")

            node: Node | None = event_node
            if till is not None:
                node = await fetch_node(conn=conn, node_id=till.node_id)
            assert node is not None

            logged_in_user = await conn.fetch_maybe_one(
                CurrentUser,
                "select "
                "   usr.*, "
                "   ut.uid as user_tag_uid, "
                "   $2::bigint as active_role_id, "
                "   urwp.name as active_role_name "
                "from usr "
                "join user_tag ut on usr.user_tag_id = ut.id "
                "left join user_role urwp on urwp.id = $2 "
                "where usr.id = $1",
                terminal.active_user_id,
                terminal.active_user_role_id,
            )

            if logged_in_user is not None and terminal.active_user_role_id is not None:
                till_node_id = till.node_id if till is not None else None
                user_event_privileges, user_node_privileges = await _fetch_terminal_user_privileges(
                    conn,
                    user_id=logged_in_user.id,
                    role_id=terminal.active_user_role_id,
                    till_node_id=till_node_id,
                )
                logged_in_user.event_privileges = user_event_privileges
                logged_in_user.node_privileges = user_node_privileges

                def check_privileges(required_privs, user_privs, priv_type: str):
                    if required_privs is not None:
                        stringified_privileges = ", ".join(map(lambda x: x.name, required_privs))

                        if logged_in_user is None:
                            raise AccessDenied(
                                f"no user is logged into this terminal but "
                                f"the following {priv_type} privileges are required {stringified_privileges}"
                            )

                        if not any(p.value in {x.value for x in user_privs} for p in required_privs):
                            raise AccessDenied(
                                f"user does not have any of the required {priv_type} privileges: {stringified_privileges}"
                            )

                check_privileges(
                    event_privileges, getattr(logged_in_user, "event_privileges", []) if logged_in_user else [], "event"
                )
                check_privileges(
                    node_privileges, getattr(logged_in_user, "node_privileges", []) if logged_in_user else [], "node"
                )

            if "current_user" in signature_params:
                kwargs["current_user"] = logged_in_user
            elif "current_user" in kwargs:
                kwargs.pop("current_user")

            if not func_is_read_only and node.read_only:
                raise NodeIsReadOnly(f"{node.name} is read only")

            if "node" in signature_params:
                kwargs["node"] = node

            if requires_till:
                if till is None:
                    raise AccessDenied("No till assigned to this terminal")

                if "current_till" in signature_params:
                    kwargs["current_till"] = till
                elif "current_till" in kwargs:
                    kwargs.pop("current_till")

            if "current_terminal" in signature_params:
                kwargs["current_terminal"] = terminal
            elif "current_terminal" in kwargs:
                kwargs.pop("current_terminal")

            if "token" not in signature_params and "token" in kwargs:
                kwargs.pop("token")

            if "conn" not in signature_params:
                kwargs.pop("conn")

            return await func(self, **kwargs)

        _add_arg_to_signature(func, wrapper, _READONLY_KWARG_NAME)

        return wrapper

    return f
