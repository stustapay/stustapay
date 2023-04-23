from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges, requires_terminal


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_system_accounts(self, *, conn: asyncpg.Connection) -> list[Account]:
        cursor = conn.cursor("select * from account where type != 'private'")
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_account(self, *, conn: asyncpg.Connection, account_id: int) -> Optional[Account]:
        row = await conn.fetchrow("select * from account where id = $1", account_id)
        if row is None:
            return None
        return Account.parse_obj(row)

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def get_account_by_user_tag(self, *, conn: asyncpg.Connection, user_tag_uid: int) -> Optional[Account]:
        row = await conn.fetchrow("select * from account where user_tag_uid = $1", user_tag_uid)
        if row is None:
            return None
        return Account.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def find_accounts(self, *, conn: asyncpg.Connection, search_term: str) -> list[Account]:
        cursor = conn.cursor(
            "select * from account where name like $1 or comment like $1 or user_tag_uid::text like $1",
            f"%{search_term}%",
        )
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result
