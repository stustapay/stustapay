import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tse import NewTse, Tse, UpdateTse
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import NotFound
from stustapay.framework.database import Connection


async def list_tses(conn: Connection) -> list[Tse]:
    return await conn.fetch_many(Tse, "select * from tse")


class TseService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: tse_management
    # @requires_user([Privilege.tse_management])
    @requires_node()
    async def create_tse(self, *, conn: Connection, new_tse: NewTse) -> Tse:
        tse_id = await conn.fetchval(
            "insert into tse (name, serial, ws_url, ws_timeout, password, status) "
            "values ($1, $2, $3, $4, $5, 'new') returning id",
            new_tse.name,
            new_tse.serial,
            new_tse.ws_url,
            new_tse.ws_timeout,
            new_tse.password,
        )
        return await conn.fetch_one(Tse, "select * from tse where id = $1", tse_id)

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: tse_management
    @requires_node()
    # @requires_user([Privilege.tse_management])
    async def update_tse(self, *, conn: Connection, tse_id: int, updated_tse: UpdateTse) -> Tse:
        tse_id = await conn.fetchval(
            "update tse set name = $1, ws_timeout = $2, ws_url = $3, password = $4 where id = $5 returning id",
            updated_tse.name,
            updated_tse.ws_timeout,
            updated_tse.ws_url,
            updated_tse.password,
            tse_id,
        )
        if tse_id is None:
            raise NotFound(element_typ="tse", element_id=str(tse_id))
        return await conn.fetch_one(Tse, "select * from tse where id = $1", tse_id)

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: tse_management
    @requires_node()
    # @requires_user([Privilege.tse_management])
    async def list_tses(self, *, conn: Connection) -> list[Tse]:
        return await list_tses(conn=conn)
