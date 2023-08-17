import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import Connection
from stustapay.core.schema.tse import Tse
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user


class TseService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: tse_management
    # @requires_user([Privilege.tse_management])
    async def list_tses(self, *, conn: Connection) -> list[Tse]:
        return await conn.fetch_many(Tse, "select * from tse")
