import re
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account, AccountType
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.terminal import Terminal
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
from stustapay.core.service.tree.common import fetch_node
from stustapay.framework.database import Connection


async def get_system_account_for_node(*, conn: Connection, node: Node, account_type: AccountType) -> Account:
    return await conn.fetch_one(
        Account,
        "select * from account_with_history where type = $1 and node_id = any($2)",
        account_type.value,
        node.parent_ids + [node.id],
    )


async def get_account_by_id(*, conn: Connection, account_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(Account, "select * from account_with_history where id = $1", account_id)


async def get_account_by_tag_uid(*, conn: Connection, tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(Account, "select * from account_with_history where user_tag_uid = $1", tag_uid)


async def get_cashier_account_by_tag_uid(*, conn: Connection, cashier_tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select a.* from usr join account_with_history a on a.id = usr.cashier_account_id where usr.user_tag_uid = $1",
        cashier_tag_uid,
    )


async def get_transport_account_by_tag_uid(*, conn: Connection, orga_tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select a.* from usr join account_with_history a on a.id = usr.transport_account_id where usr.user_tag_uid = $1",
        orga_tag_uid,
    )


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def list_system_accounts(self, *, conn: Connection, node: Node) -> list[Account]:
        return await conn.fetch_many(
            Account,
            "select * from account_with_history where type != 'private' and node_id = any($1)",
            node.ids_to_event_node,
        )

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def get_account(self, *, conn: Connection, account_id: int) -> Account:
        # TODO: TREE visibility
        account = await get_account_by_id(conn=conn, account_id=account_id)
        if account is None:
            raise NotFound(element_typ="account", element_id=str(account_id))
        return account

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def get_account_by_tag_uid(self, *, conn: Connection, user_tag_uid: int) -> Optional[Account]:
        # TODO: TREE visibility
        return await get_account_by_tag_uid(conn=conn, tag_uid=user_tag_uid)

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def find_accounts(self, *, conn: Connection, node: Node, search_term: str) -> list[Account]:
        value_as_int = None
        if re.match("^[A-Fa-f0-9]+$", search_term):
            value_as_int = int(search_term, base=16)

        # the following query won't be able to find full uint64 tag uids as we need cast the numeric(20) to bigint in
        # order to do hex conversion in postgres, therefore loosing one bit of information as bigint is in64 not uint64
        return await conn.fetch_many(
            Account,
            "select * from account_with_history "
            "where node_id = any ($3) and "
            "   (name like $1 "
            "   or comment like $1 "
            "   or (user_tag_uid is not null and to_hex(user_tag_uid::bigint) like $1) "
            "   or (user_tag_uid is not null and user_tag_uid = $2))",
            f"%{search_term.lower()}%",
            value_as_int,
            node.ids_to_root,
        )

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def disable_account(self, *, conn: Connection, account_id: int):
        # TODO: TREE visibility
        row = await conn.fetchval("update account set user_tag_uid = null where id = $1 returning id", account_id)
        if row is None:
            raise NotFound(element_typ="account", element_id=str(account_id))

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def update_account_balance(
        self, *, conn: Connection, current_user: User, account_id: int, new_balance: float
    ) -> bool:
        raise RuntimeError("currently disallowed")
        # account = await self.get_account(conn=conn, current_user=current_user, account_id=account_id)
        # if account is None:
        #     return False
        #
        # imbalance = new_balance - account.balance
        # try:
        #     await conn.fetchval(
        #         "select * from book_transaction("
        #         "   order_id => null,"
        #         "   description => $1,"
        #         "   source_account_id => $2,"
        #         "   target_account_id => $3,"
        #         "   amount => $4,"
        #         "   vouchers_amount => 0,
        #         "   conducting_user_id => $5)",
        #         "Admin override for account balance",
        #         ACCOUNT_MONEY_VOUCHER_CREATE,
        #         account.id,
        #         imbalance,
        #         current_user.id,
        #     )
        # except:  # pylint: disable=bare-except
        #     return False
        # return True

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def update_account_vouchers(
        self, *, conn: Connection, current_user: User, node: Node, account_id: int, new_voucher_amount: int
    ) -> bool:
        # TODO: TREE visibility
        account = await self.get_account(  # pylint: disable=unexpected-keyword-arg
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
        self, *, conn: Connection, current_user: User, current_terminal: Terminal, user_tag_uid: int, vouchers: int
    ) -> Account:
        # TODO: TREE visibility
        if vouchers <= 0:
            raise InvalidArgument("voucher amount must be positive")

        account = await get_account_by_tag_uid(conn=conn, tag_uid=user_tag_uid)
        if account is None:
            raise InvalidArgument(f"Tag {format_user_tag_uid(user_tag_uid)} is not registered")

        node = await fetch_node(conn=conn, node_id=current_terminal.till.node_id)
        assert node is not None
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

        account = await get_account_by_tag_uid(conn=conn, tag_uid=user_tag_uid)
        assert account is not None
        return account

    @with_db_transaction
    @requires_terminal([Privilege.grant_free_tickets])
    async def grant_free_tickets(
        self,
        *,
        conn: Connection,
        current_terminal: Terminal,
        current_user: User,
        new_free_ticket_grant: NewFreeTicketGrant,
    ) -> Account:
        # TODO: TREE visibility
        user_tag = await conn.fetchrow(
            "select true as found, a.id as account_id "
            "from user_tag u left join account a on a.user_tag_uid = u.uid where u.uid = $1",
            new_free_ticket_grant.user_tag_uid,
        )
        if user_tag is None:
            raise InvalidArgument(f"Tag does not exist {format_user_tag_uid(new_free_ticket_grant.user_tag_uid)}")

        if user_tag["account_id"] is not None:
            raise InvalidArgument("Tag is already registered")

        # create a new customer account for the given tag
        # TODO: NODE use node_id here
        account_id = await conn.fetchval(
            "insert into account (node_id, user_tag_uid, type) values ($1, $2, 'private') returning id",
            current_terminal.till.node_id,
            new_free_ticket_grant.user_tag_uid,
        )

        node = await fetch_node(conn=conn, node_id=current_terminal.till.node_id)
        assert node is not None
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

        account = await get_account_by_id(conn=conn, account_id=account_id)
        assert account is not None
        return account

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def update_account_comment(self, *, conn: Connection, account_id: int, comment: str) -> Account:
        # TODO: TREE visibility
        ret = await conn.fetchval("update account set comment = $1 where id = $2 returning id", comment, account_id)
        if ret is None:
            raise NotFound(element_typ="account", element_id=account_id)

        acc = await get_account_by_id(conn=conn, account_id=account_id)
        assert acc is not None
        return acc

    @staticmethod
    async def _switch_account_tag_uid(
        *, conn: Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
    ):
        account_exists = await conn.fetchval("select exists(select from account where id = $1)", account_id)
        if not account_exists:
            raise NotFound(element_typ="account", element_id=account_id)

        old_user_tag_uid = await conn.fetchval("select user_tag_uid from account where id = $1", account_id)
        await conn.fetchval(
            "update account set user_tag_uid = $2 where id = $1 returning id", account_id, new_user_tag_uid
        )
        await conn.execute("update user_tag set comment = $2 where uid = $1", old_user_tag_uid, comment)

    @with_db_transaction
    @requires_user([Privilege.account_management])
    @requires_node()
    async def switch_account_tag_uid_admin(
        self, *, conn: Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
    ):
        # TODO: TREE visibility
        await self._switch_account_tag_uid(
            conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid, comment=comment
        )

    @with_db_transaction
    @requires_terminal([Privilege.account_management])
    async def switch_account_tag_uid_terminal(
        self, *, conn: Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
    ):
        # TODO: TREE visibility
        await self._switch_account_tag_uid(
            conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid, comment=comment
        )
