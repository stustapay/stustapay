from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import Connection
from stustapay.core.schema.tax_rate import TaxRate, TaxRateWithoutName
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction


class TaxRateService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    async def create_tax_rate(self, *, conn: Connection, tax_rate: TaxRate) -> TaxRate:
        return await conn.fetch_one(
            TaxRate,
            "insert into tax (name, rate, description) values ($1, $2, $3) returning name, rate, description",
            tax_rate.name,
            tax_rate.rate,
            tax_rate.description,
        )

    @with_db_transaction
    @requires_user()
    async def list_tax_rates(self, *, conn: Connection) -> list[TaxRate]:
        return await conn.fetch_many(TaxRate, "select * from tax")

    @with_db_transaction
    @requires_user()
    async def get_tax_rate(self, *, conn: Connection, tax_rate_name: str) -> Optional[TaxRate]:
        return await conn.fetch_maybe_one(TaxRate, "select * from tax where name = $1", tax_rate_name)

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    async def update_tax_rate(
        self, *, conn: Connection, tax_rate_name: str, tax_rate: TaxRateWithoutName
    ) -> Optional[TaxRate]:
        return await conn.fetch_maybe_one(
            TaxRate,
            "update tax set rate = $2, description = $3 where name = $1 returning name, rate, description",
            tax_rate_name,
            tax_rate.rate,
            tax_rate.description,
        )

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    async def delete_tax_rate(self, *, conn: Connection, tax_rate_name: str) -> bool:
        result = await conn.execute(
            "delete from tax where name = $1",
            tax_rate_name,
        )
        return result != "DELETE 0"
