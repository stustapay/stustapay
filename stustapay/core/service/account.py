import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges


class AccountService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_accounts(self, *, conn: asyncpg.Connection) -> list[Account]:
        cursor = conn.cursor("select * from account")
        result = []
        async for row in cursor:
            result.append(Account.parse_obj(row))
        return result
