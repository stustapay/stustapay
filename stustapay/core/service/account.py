from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account, ACCOUNT_MONEY_VOUCHER_CREATE
from stustapay.core.schema.user import Privilege, User
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user, requires_terminal
from stustapay.core.service.common.error import NotFound


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.admin, Privilege.finanzorga])
    async def list_system_accounts(self, *, conn: asyncpg.Connection) -> list[Account]:
        cursor = conn.cursor("select * from account where type != 'private'")
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.admin, Privilege.finanzorga])
    async def get_account(self, *, conn: asyncpg.Connection, account_id: int) -> Optional[Account]:
        row = await conn.fetchrow("select * from account where id = $1", account_id)
        if row is None:
            return None
        return Account.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.admin, Privilege.finanzorga])
    async def find_accounts(self, *, conn: asyncpg.Connection, search_term: str) -> list[Account]:
        cursor = conn.cursor(
            "select * from account where name like $1 or comment like $1 or user_tag_uid::text like $1",
            f"%{search_term}%",
        )
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.admin])
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
    @requires_user([Privilege.admin, Privilege.finanzorga])
    async def update_account_vouchers(
        self, *, conn: asyncpg.Connection, current_user: User, account_id: int, new_voucher_amount: int
    ) -> bool:
        account = await self.get_account(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_user=current_user, account_id=account_id
        )
        if account is None:
            return False

        imbalance = new_voucher_amount - account.vouchers
        try:
            await conn.fetchval(
                "select * from book_transaction("
                "   order_id => null,"
                "   description => $1,"
                "   source_account_id => $2,"
                "   target_account_id => $3,"
                "   amount => 0,"
                "   vouchers_amount => $4,"
                "   conducting_user_id => $5)",
                "Admin override for account voucher amount",
                ACCOUNT_MONEY_VOUCHER_CREATE,
                account.id,
                imbalance,
                current_user.id,
            )
        except:  # pylint: disable=bare-except
            return False
        return True

    async def _switch_account_tag_uid(
        self, *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int
    ) -> bool:
        ret = await conn.fetchval(
            "update account set user_tag_uid = $2 where id = $1 returning id", account_id, new_user_tag_uid
        )
        if ret is None:
            raise NotFound(element_typ="account", element_id=account_id)
        return True

    @with_db_transaction
    @requires_user([Privilege.admin, Privilege.finanzorga])
    async def switch_account_tag_uid_admin(
        self, *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int
    ) -> bool:
        return await self._switch_account_tag_uid(conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid)

    @with_db_transaction
    @requires_terminal([Privilege.admin, Privilege.finanzorga])
    async def switch_account_tag_uid_terminal(
        self, *, conn: asyncpg.Connection, account_id: int, new_user_tag_uid: int
    ) -> bool:
        return await self._switch_account_tag_uid(conn=conn, account_id=account_id, new_user_tag_uid=new_user_tag_uid)
