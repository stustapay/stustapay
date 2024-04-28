from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account, AccountType
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import Privilege, User, format_user_tag_uid
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.transaction import book_transaction
from stustapay.framework.database import Connection


async def get_system_account_for_node(*, conn: Connection, node: Node, account_type: AccountType) -> Account:
    return await conn.fetch_one(
        Account,
        "select * from account_with_history where type = $1 and node_id = any($2)",
        account_type.value,
        node.ids_to_event_node,
    )


async def get_account_by_id(*, conn: Connection, node: Node, account_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history where id = $1 and node_id = any($2)",
        account_id,
        node.ids_to_event_node,
    )


async def get_account_by_tag_uid(*, conn: Connection, node: Node, tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history a where user_tag_uid = $1 and node_id = any($2)",
        tag_uid,
        node.ids_to_event_node,
    )


async def get_account_by_tag_id(*, conn: Connection, node: Node, tag_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history a where a.user_tag_id = $1 and node_id = any($2)",
        tag_id,
        node.ids_to_event_node,
    )


async def get_cashier_account_by_tag_uid(*, conn: Connection, node: Node, cashier_tag_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select a.* from usr join account_with_history a on a.id = usr.cashier_account_id "
        "where usr.user_tag_id = $1 and usr.node_id = any($2)",
        cashier_tag_id,
        node.ids_to_event_node,
    )


async def get_transport_account_by_tag_uid(*, conn: Connection, node: Node, orga_tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select a.* "
        "from usr "
        "   join account_with_history a on a.id = usr.transport_account_id "
        "   join user_tag t on usr.user_tag_id = t.id "
        "where t.uid = $1 and usr.node_id = any($2)",
        orga_tag_uid,
        node.ids_to_event_node,
    )


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.customer_management])
    async def get_customer(self, *, conn: Connection, node: Node, customer_id: int) -> Customer:
        customer = await conn.fetch_maybe_one(
            Customer,
            "select c.* from customer c where c.id = $1 and c.node_id = any($2)",
            customer_id,
            node.ids_to_event_node,
        )
        if customer is None:
            raise NotFound(element_typ="customer", element_id=customer_id)
        return customer

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.customer_management])
    async def find_customers(self, *, conn: Connection, node: Node, search_term: str) -> list[Customer]:
        return await conn.fetch_many(
            Customer,
            "select c.* from customer c "
            "where c.node_id = any ($2) and "
            "   (c.name like $1 "
            "   or c.comment like $1 "
            "   or (c.user_tag_pin is not null and lower(c.user_tag_pin) like $1) "
            "   or (c.user_tag_uid is not null and to_hex(c.user_tag_uid::bigint) like $1) "
            "   or lower(c.email) like $1 "
            "   or c.account_name @@ $3 "
            "   or lower(c.iban) like $1)",
            f"%{search_term.lower()}%",
            node.ids_to_root,
            search_term.lower(),
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_system_accounts(self, *, conn: Connection, node: Node) -> list[Account]:
        return await conn.fetch_many(
            Account,
            "select * from account_with_history where type != 'private' and node_id = any($1)",
            node.ids_to_event_node,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_account(self, *, conn: Connection, node: Node, account_id: int) -> Account:
        account = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        if account is None:
            raise NotFound(element_typ="account", element_id=str(account_id))
        return account

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_account_by_tag_id(self, *, conn: Connection, node: Node, user_tag_id: int) -> Optional[Account]:
        return await get_account_by_tag_id(conn=conn, node=node, tag_id=user_tag_id)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def find_accounts(self, *, conn: Connection, node: Node, search_term: str) -> list[Account]:
        return await conn.fetch_many(
            Account,
            "select * from account_with_history a "
            "where a.node_id = any ($2) and "
            "   (a.name like $1 "
            "   or a.comment like $1 "
            "   or (a.user_tag_pin is not null and a.user_tag_pin like $1)) "
            "   or (a.user_tag_uid is not null and to_hex(a.user_tag_uid::bigint) like $1) ",
            f"%{search_term.lower()}%",
            node.ids_to_root,
        )

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def disable_account(self, *, conn: Connection, node: Node, account_id: int):
        row = await conn.fetchval(
            "update account set user_tag_id = null where id = $1 and node_id = any($2) returning id",
            account_id,
            node.ids_to_event_node,
        )
        if row is None:
            raise NotFound(element_typ="account", element_id=str(account_id))

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def update_account_balance(
        self, *, conn: Connection, current_user: User, account_id: int, new_balance: float
    ) -> bool:
        raise RuntimeError("currently disallowed")

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def update_account_vouchers(
        self, *, conn: Connection, current_user: User, node: Node, account_id: int, new_voucher_amount: int
    ) -> bool:
        account = await self.get_account(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, account_id=account_id
        )
        if account is None:
            return False

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        imbalance = new_voucher_amount - account.vouchers
        await book_transaction(
            conn=conn,
            description="Admin override for account voucher amount",
            source_account_id=voucher_create_acc.id,
            target_account_id=account.id,
            voucher_amount=imbalance,
            conducting_user_id=current_user.id,
        )
        return True

    @with_db_transaction
    @requires_terminal([Privilege.grant_vouchers])
    async def grant_vouchers(
        self,
        *,
        conn: Connection,
        current_user: User,
        node: Node,
        user_tag_uid: int,
        vouchers: int,
    ) -> Account:
        if vouchers <= 0:
            raise InvalidArgument("voucher amount must be positive")

        account = await get_account_by_tag_uid(conn=conn, node=node, tag_uid=user_tag_uid)
        if account is None:
            raise InvalidArgument(f"Tag {format_user_tag_uid(user_tag_uid)} is not registered")

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        try:
            await book_transaction(
                conn=conn,
                description="voucher grant",
                source_account_id=voucher_create_acc.id,
                target_account_id=account.id,
                voucher_amount=vouchers,
                conducting_user_id=current_user.id,
            )
        except Exception as e:  # pylint: disable=bare-except
            raise InvalidArgument(f"Error while granting vouchers {str(e)}") from e

        account = await get_account_by_tag_uid(conn=conn, node=node, tag_uid=user_tag_uid)
        assert account is not None
        return account

    @with_db_transaction
    @requires_terminal([Privilege.grant_free_tickets])
    async def grant_free_tickets(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: User,
        new_free_ticket_grant: NewFreeTicketGrant,
    ) -> Account:
        user_tag = await conn.fetchrow(
            "select true as found, u.id as user_tag_id, a.id as account_id "
            "from user_tag u left join account a on a.user_tag_id = u.id where u.pin = $1 and u.node_id = any($2)",
            new_free_ticket_grant.user_tag_pin,
            node.ids_to_event_node,
        )
        if user_tag is None:
            raise InvalidArgument(f"Tag does not exist {new_free_ticket_grant.user_tag_pin}")

        if user_tag["account_id"] is not None:
            raise InvalidArgument("Tag is already registered")

        # create a new customer account for the given tag
        account_id = await conn.fetchval(
            "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private') returning id",
            node.event_node_id,
            user_tag["user_tag_id"],
        )
        await conn.execute(
            "update user_tag set uid = $1 where id = $2", new_free_ticket_grant.user_tag_uid, user_tag["user_tag_id"]
        )

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        if new_free_ticket_grant.initial_voucher_amount > 0:
            await book_transaction(
                conn=conn,
                description="Initial voucher amount for volunteer ticket",
                source_account_id=voucher_create_acc.id,
                target_account_id=account_id,
                voucher_amount=new_free_ticket_grant.initial_voucher_amount,
                conducting_user_id=current_user.id,
            )

        account = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        assert account is not None
        return account

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def update_account_comment(self, *, conn: Connection, node: Node, account_id: int, comment: str) -> Account:
        ret = await conn.fetchval(
            "update account set comment = $1 where id = $2 and node_id = any($3) returning id",
            comment,
            account_id,
            node.ids_to_root,
        )
        if ret is None:
            raise NotFound(element_typ="account", element_id=account_id)

        acc = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        assert acc is not None
        return acc

    @staticmethod
    async def _switch_account_tag_uid(
        *,
        conn: Connection,
        node: Node,
        account_id: int,
        new_user_tag_pin: str,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        account_exists = await conn.fetchval("select exists(select from account where id = $1)", account_id)
        if not account_exists:
            raise NotFound(element_typ="account", element_id=account_id)

        old_user_tag_id = await conn.fetchval(
            "select user_tag_id from account where id = $1 and node_id = any($2)", account_id, node.ids_to_root
        )
        new_user_tag_id = await conn.fetchval(
            "select id from user_tag where pin = $1 and node_id = any($2)", new_user_tag_pin, node.ids_to_root
        )
        if new_user_tag_id is None:
            raise NotFound(element_typ="user_tag", element_id=new_user_tag_pin)

        new_tag_is_registered = await conn.fetchval(
            "select exists(select from account where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_is_registered:
            raise InvalidArgument("New tag is already activated in the system")

        new_tag_was_used = await conn.fetchval(
            "select exists(select from account_tag_association_history where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_was_used:
            raise InvalidArgument("New tag has been previously associated with an account")

        await conn.fetchval(
            "update account set user_tag_id = $2 where id = $1 returning id", account_id, new_user_tag_id
        )
        await conn.execute("update user_tag set uid = $2 where id = $1", new_user_tag_id, new_user_tag_uid)
        await conn.execute("update user_tag set comment = $2 where id = $1", old_user_tag_id, comment)

    @with_db_transaction
    @requires_terminal([Privilege.node_administration])
    async def switch_account_tag_uid_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        account_id: int,
        new_user_tag_pin: str,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        await self._switch_account_tag_uid(
            conn=conn,
            node=node,
            account_id=account_id,
            new_user_tag_pin=new_user_tag_pin,
            new_user_tag_uid=new_user_tag_uid,
            comment=comment,
        )
