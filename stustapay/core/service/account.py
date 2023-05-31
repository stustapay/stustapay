import re
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account, ACCOUNT_MONEY_VOUCHER_CREATE, UserTagDetail
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.user import Privilege, User, CurrentUser, format_user_tag_uid
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user, requires_terminal
from stustapay.core.service.common.error import NotFound, InvalidArgument
from stustapay.core.service.transaction import book_transaction


async def get_account_by_id(*, conn: asyncpg.Connection, account_id: int) -> Optional[Account]:
    row = await conn.fetchrow("select * from account_with_history where id = $1", account_id)
    if row is None:
        return None
    return Account.parse_obj(row)


async def get_account_by_tag_uid(*, conn: asyncpg.Connection, tag_uid: int) -> Optional[Account]:
    row = await conn.fetchrow("select * from account_with_history where user_tag_uid = $1", tag_uid)
    if row is None:
        return None
    return Account.parse_obj(row)


async def get_cashier_account_by_tag_uid(*, conn: asyncpg.Connection, cashier_tag_uid: int) -> Optional[Account]:
    row = await conn.fetchrow(
        "select a.* from usr join account_with_history a on a.id = usr.cashier_account_id where usr.user_tag_uid = $1",
        cashier_tag_uid,
    )
    if row is None:
        return None
    return Account.parse_obj(row)


async def get_transport_account_by_tag_uid(*, conn: asyncpg.Connection, orga_tag_uid: int) -> Optional[Account]:
    row = await conn.fetchrow(
        "select a.* from usr join account_with_history a on a.id = usr.transport_account_id where usr.user_tag_uid = $1",
        orga_tag_uid,
    )
    if row is None:
        return None
    return Account.parse_obj(row)


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def get_user_tag_detail(self, *, conn: asyncpg.Connection, user_tag_uid: int) -> Optional[UserTagDetail]:
        row = await conn.fetchrow("select * from user_tag_with_history utwh where user_tag_uid = $1", user_tag_uid)
        if row is None:
            return None
        return UserTagDetail.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def update_user_tag_comment(
        self, *, conn: asyncpg.Connection, current_user: CurrentUser, user_tag_uid: int, comment: str
    ) -> UserTagDetail:
        ret = await conn.fetchval(
            "update user_tag set comment = $1 where uid = $2 returning uid", comment, user_tag_uid
        )
        if ret is None:
            raise InvalidArgument(f"User tag {format_user_tag_uid(user_tag_uid)} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, user_tag_uid=user_tag_uid
        )
        assert detail is not None
        return detail

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def list_system_accounts(self, *, conn: asyncpg.Connection) -> list[Account]:
        cursor = conn.cursor("select * from account_with_history where type != 'private'")
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def get_account(self, *, conn: asyncpg.Connection, account_id: int) -> Account:
        account = await get_account_by_id(conn=conn, account_id=account_id)
        if account is None:
            raise NotFound(element_typ="account", element_id=str(account_id))
        return account

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def get_account_by_tag_uid(self, *, conn: asyncpg.Connection, user_tag_uid: int) -> Optional[Account]:
        return await get_account_by_tag_uid(conn=conn, tag_uid=user_tag_uid)

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def find_accounts(self, *, conn: asyncpg.Connection, search_term: str) -> list[Account]:
        value_as_int = None
        if re.match("[a-f0-9]+", search_term):
            value_as_int = int(search_term, base=16)

        # the following query won't be able to find full uint64 tag uids as we need cast the numeric(20) to bigint in
        # order to do hex conversion in postgres, therefore loosing one bit of information as bigint is in64 not uint64
        cursor = conn.cursor(
            "select * from account_with_history "
            "where name like $1 "
            "   or comment like $1 "
            "   or (user_tag_uid is not null and to_hex(user_tag_uid::bigint) like $1) "
            "   or (user_tag_uid is not null and user_tag_uid = $2)",
            f"%{search_term}%",
            value_as_int,
        )
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def disable_account(self, *, conn: asyncpg.Connection, account_id: int):
        row = await conn.fetchval("update account set user_tag_uid = null where id = $1 returning id", account_id)
        if row is None:
            raise NotFound(element_typ="account", element_id=str(account_id))

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def update_account_balance(
        self, *, conn: asyncpg.Connection, current_user: User, account_id: int, new_balance: float
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
    async def update_account_vouchers(
        self, *, conn: asyncpg.Connection, current_user: User, account_id: int, new_voucher_amount: int
    ) -> bool:
        account = await self.get_account(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, account_id=account_id
        )
        if account is None:
            return False

        imbalance = new_voucher_amount - account.vouchers
        await book_transaction(
            conn=conn,
            description="Admin override for account voucher amount",
            source_account_id=ACCOUNT_MONEY_VOUCHER_CREATE,
            target_account_id=account.id,
            voucher_amount=imbalance,
            conducting_user_id=current_user.id,
        )
        return True

    @with_db_transaction
    @requires_terminal([Privilege.grant_vouchers])
    async def grant_vouchers(
        self, *, conn: asyncpg.Connection, current_user: User, user_tag_uid: int, vouchers: int
    ) -> Account:
        if vouchers <= 0:
            raise InvalidArgument("voucher amount must be positive")

        account = await get_account_by_tag_uid(conn=conn, tag_uid=user_tag_uid)
        if account is None:
            raise InvalidArgument(f"Tag {format_user_tag_uid(user_tag_uid)} is not registered")

        try:
            await book_transaction(
                conn=conn,
                description="voucher grant",
                source_account_id=ACCOUNT_MONEY_VOUCHER_CREATE,
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
        self, *, conn: asyncpg.Connection, current_user: User, new_free_ticket_grant: NewFreeTicketGrant
    ) -> Account:
        user_tag = await conn.fetchrow(
            "select true as found, a.id as account_id "
            "from user_tag u left join account a on a.user_tag_uid = u.uid where u.uid = $1",
            new_free_ticket_grant.user_tag_uid,
        )
        if user_tag is None:
            raise NotFound(element_typ="user_tag", element_id=new_free_ticket_grant.user_tag_uid, hex_formatting=True)

        if user_tag["account_id"] is not None:
            raise InvalidArgument("Tag is already registered")

        # create a new customer account for the given tag
        account_id = await conn.fetchval(
            "insert into account (user_tag_uid, type) values ($1, 'private') returning id",
            new_free_ticket_grant.user_tag_uid,
        )

        if new_free_ticket_grant.initial_voucher_amount > 0:
            await book_transaction(
                conn=conn,
                description="Initial voucher amount for volunteer ticket",
                source_account_id=ACCOUNT_MONEY_VOUCHER_CREATE,
                target_account_id=account_id,
                voucher_amount=new_free_ticket_grant.initial_voucher_amount,
                conducting_user_id=current_user.id,
            )

        account = await get_account_by_id(conn=conn, account_id=account_id)
        assert account is not None
        return account

    @with_db_transaction
    @requires_user([Privilege.account_management])
    async def update_account_comment(self, *, conn: asyncpg.Connection, account_id: int, comment: str) -> Account:
        ret = await conn.fetchval("update account set comment = $1 where id = $2 returning id", comment, account_id)
        if ret is None:
            raise NotFound(element_typ="account", element_id=account_id)

        acc = await get_account_by_id(conn=conn, account_id=account_id)
        assert acc is not None
        return acc

    @staticmethod
    async def _switch_account_tag_uid(
        *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
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
    async def switch_account_tag_uid_admin(
        self, *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
    ):
        await self._switch_account_tag_uid(
            conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid, comment=comment
        )

    @with_db_transaction
    @requires_terminal([Privilege.account_management])
    async def switch_account_tag_uid_terminal(
        self, *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int, comment: Optional[str]
    ):
        await self._switch_account_tag_uid(
            conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid, comment=comment
        )
