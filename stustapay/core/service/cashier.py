import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.cashier import Cashier
from stustapay.core.schema.user import Privilege
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges
from .user import AuthService


class CashierService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin, Privilege.finanzorga])
    async def list_cashiers(self, *, conn: asyncpg.Connection) -> list[Cashier]:
        cursor = conn.cursor("select * from cashiers")
        result = []
        async for row in cursor:
            result.append(Cashier.parse_obj(row))
        return result
