from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order
from stustapay.core.schema.terminal import CurrentTerminal
from stustapay.core.schema.till import NewTill, Till, UserInfo, UserRoleInfo
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import (
    CurrentUser,
    Privilege,
    UserRole,
    UserTag,
    format_user_tag_uid,
)
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
    with_db_transaction,
    with_retryable_db_transaction,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument, NotFound
from stustapay.core.service.till.common import create_till, fetch_till
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.till.register import TillRegisterService
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user import AuthService
from stustapay.framework.database import Connection


async def logout_user_from_till(conn: Connection, node_id: int, till_id: int):
    result = await conn.fetchval(
        "update till set active_user_id = null, active_user_role_id = null "
        "where id = $1 and node_id = $2 returning id",
        till_id,
        node_id,
    )
    if result is None:
        raise InvalidArgument("till does not exist")


async def remove_terminal_from_till(conn: Connection, node_id: int, till_id: int):
    result = await conn.fetchval(
        "update till set terminal_id = null where id = $1 and node_id = $2 returning id",
        till_id,
        node_id,
    )
    if result is None:
        raise InvalidArgument("till does not exist")

    await logout_user_from_till(conn=conn, node_id=node_id, till_id=till_id)


async def assign_till_to_terminal(conn: Connection, node: Node, till_id: int, terminal_id: int):
    till = await fetch_till(conn=conn, node=node, till_id=till_id)
    assert till is not None
    if till.terminal_id is not None:
        raise InvalidArgument(f"Till {till.name} already has a terminal assigned")
    await conn.execute("update till set terminal_id = $1 where id = $2", terminal_id, till_id)


class TillService(DBService):
    def __init__(
        self,
        db_pool: asyncpg.Pool,
        config: Config,
        auth_service: AuthService,
    ):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.profile = TillProfileService(db_pool, config, auth_service)
        self.layout = TillLayoutService(db_pool, config, auth_service)
        self.register = TillRegisterService(db_pool, config, auth_service)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_till(self, *, conn: Connection, node: Node, till: NewTill) -> Till:
        return await create_till(conn=conn, node_id=node.id, till=till)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_tills(self, *, node: Node, conn: Connection) -> list[Till]:
        return await conn.fetch_many(
            Till,
            "select t.* from till_with_cash_register t join node n on t.node_id = n.id "
            "where (t.node_id = any($1) or $2 = any(n.parent_ids)) and not t.is_virtual "
            "order by t.name",
            node.ids_to_event_node,
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_till(self, *, conn: Connection, node: Node, till_id: int) -> Optional[Till]:
        return await fetch_till(conn=conn, node=node, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_till(self, *, conn: Connection, node: Node, till_id: int, till: NewTill) -> Till:
        row = await conn.fetchrow(
            "update till set name = $2, description = $3, active_shift = $4, active_profile_id = $5, terminal_id = $6 "
            "where id = $1 and node_id = $7 returning id",
            till_id,
            till.name,
            till.description,
            till.active_shift,
            till.active_profile_id,
            till.terminal_id,
            node.id,
        )
        if row is None:
            raise NotFound(element_typ="till", element_id=till_id)

        updated_till = await fetch_till(conn=conn, node=node, till_id=till_id)
        assert updated_till is not None
        return updated_till

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_till(self, *, conn: Connection, node: Node, till_id: int) -> bool:
        result = await conn.execute("delete from till where id = $1 and node_id = $2", till_id, node.id)
        return result != "DELETE 0"

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def force_logout_user(self, *, conn: Connection, node: Node, till_id: int):
        await logout_user_from_till(conn=conn, node_id=node.id, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def remove_from_terminal(self, *, conn: Connection, node: Node, till_id: int):
        await remove_terminal_from_till(conn=conn, node_id=node.id, till_id=till_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def switch_terminal(self, *, conn: Connection, node: Node, till_id: int, new_terminal_id: int):
        await remove_terminal_from_till(conn=conn, node_id=node.id, till_id=till_id)
        await assign_till_to_terminal(conn=conn, node=node, till_id=till_id, terminal_id=new_terminal_id)

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def check_user_login(
        self,
        *,
        node: Node,
        conn: Connection,
        current_user: CurrentUser,
        user_tag: UserTag,
    ) -> list[UserRole]:
        """
        Check if a user can log in to the terminal and return the available roles he can log in as
        """

        # we fetch all roles that contain either the terminal login or supervised terminal login privilege
        available_roles = await conn.fetch_many(
            UserRole,
            "select urwp.* "
            "from user_role_with_privileges urwp "
            "join user_to_role urt on urwp.id = urt.role_id "
            "join usr on urt.user_id = usr.id "
            "join user_tag ut on usr.user_tag_id = ut.id "
            "where ut.uid = $1 "
            "   and ($2 = any(urwp.privileges) or $3 = any(urwp.privileges)) "
            "   and urt.node_id = any($4)",
            user_tag.uid,
            Privilege.terminal_login.name,
            Privilege.supervised_terminal_login.name,
            node.ids_to_root,
        )
        if len(available_roles) == 0:
            raise AccessDenied(
                "User is not known or does not have any assigned roles or the user does not "
                "have permission to login at a terminal"
            )

        new_user_id = await conn.fetchval("select id from user_with_tag where user_tag_uid = $1", user_tag.uid)
        assert new_user_id is not None

        new_user_is_supervisor = await conn.fetchval(
            "select true from user_privileges_at_node($1) where $2 = any(privileges_at_node) and node_id = $3",
            new_user_id,
            Privilege.terminal_login.name,
            node.id,
        )
        if not new_user_is_supervisor:
            if current_user is None or Privilege.terminal_login not in current_user.privileges:
                raise AccessDenied("You can only be logged in by a supervisor")

        return available_roles

    @with_retryable_db_transaction()
    @requires_terminal()
    async def login_user(
        self,
        *,
        conn: Connection,
        token: str,
        current_terminal: CurrentTerminal,
        user_tag: UserTag,
        user_role_id: int,
    ) -> CurrentUser:
        """
        Login a User to the terminal, but only if the correct permissions exists:
        wants to log in | allowed to log in
        official        | always
        cashier         | only if official is logged in

        where officials are admins and finanzorgas

        returns the newly logged-in User if successful
        """
        assert current_terminal.till is not None
        available_roles = await self.check_user_login(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, user_tag=user_tag
        )
        if not any(x.id == user_role_id for x in available_roles):
            raise AccessDenied("The user does not have the requested role")

        user_id = await conn.fetchval("select id from user_with_tag where user_tag_uid = $1", user_tag.uid)
        assert user_id is not None

        t_id = await conn.fetchval(
            "update till set active_user_id = $1, active_user_role_id = $2 where id = $3 returning id",
            user_id,
            user_role_id,
            current_terminal.till.id,
        )
        assert t_id is not None
        # instead of manually redoing the necessary queries we simply reuse the normal auth decorator
        current_user = await self.get_current_user(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn, token=token
        )
        assert current_user is not None
        return current_user

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def get_current_user(self, *, current_user: Optional[CurrentUser]) -> Optional[CurrentUser]:
        return current_user

    @with_db_transaction
    @requires_terminal()
    async def logout_user(self, *, conn: Connection, current_terminal: CurrentTerminal):
        """
        Logout the currently logged-in user. This is always possible
        """
        assert current_terminal.till is not None

        await conn.fetchval(
            "update till set active_user_id = null, active_user_role_id = null where id = $1",
            current_terminal.till.id,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal()
    async def get_user_info(
        self, *, conn: Connection, current_user: CurrentUser, node: Node, user_tag_uid: int
    ) -> UserInfo:
        if (
            Privilege.node_administration not in current_user.privileges
            and Privilege.user_management not in current_user.privileges
            and user_tag_uid != current_user.user_tag_uid
        ):
            raise AccessDenied("cannot retrieve user info for someone other than yourself")

        info = await conn.fetch_maybe_one(
            UserInfo,
            "select "
            "   u.*, "
            "   cash_a.balance as cash_drawer_balance, "
            "   transp_a.balance as transport_account_balance, "
            "   cr.id as cash_register_id, "
            "   cr.name as cash_register_name,"
            "   '[]'::json as assigned_roles "
            "from user_with_tag u "
            "left join account cash_a on cash_a.id = u.cashier_account_id "
            "left join account transp_a on transp_a.id = u.transport_account_id "
            "left join cash_register cr on u.cash_register_id = cr.id "
            "where u.user_tag_uid = $1",
            user_tag_uid,
        )
        if info is None:
            raise InvalidArgument(f"There is no user registered for tag {format_user_tag_uid(user_tag_uid)}")

        assigned_roles = await conn.fetch_many(
            UserRoleInfo,
            "select "
            "   ur.*, "
            "   utr.node_id,"
            "   n.name as node_name, "
            "   utr.node_id = $3 as is_at_current_node "
            "from user_role_with_privileges ur "
            "join user_to_role utr on ur.id = utr.role_id "
            "join node n on utr.node_id = n.id "
            "where n.id = any($2) and utr.user_id = $1",
            info.id,
            node.ids_to_root,
            node.id,
        )

        info.assigned_roles = assigned_roles
        return info

    @with_db_transaction(read_only=True)
    @requires_terminal(requires_till=False)
    async def get_customer(
        self, *, conn: Connection, current_terminal: CurrentTerminal, customer_tag_uid: int
    ) -> Account:
        node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert node is not None
        customer = await conn.fetch_maybe_one(
            Account,
            "select * from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")
        return customer

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.customer_management])
    async def get_customer_orders(
        self, *, conn: Connection, current_terminal: CurrentTerminal, customer_tag_uid: int
    ) -> list[Order]:
        node = await fetch_node(conn=conn, node_id=current_terminal.node_id)
        assert node is not None
        customer_id = await conn.fetchval(
            "select id from account_with_history a where a.user_tag_uid = $1 and node_id = any($2)",
            customer_tag_uid,
            node.ids_to_event_node,
        )
        if customer_id is None:
            raise InvalidArgument(f"Customer with tag uid {format_user_tag_uid(customer_tag_uid)} does not exist")

        orders = await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered((select array_agg(o.id) from ordr o where customer_account_id = $1))",
            customer_id,
        )
        return orders
