from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tax_rate import TaxRate, TaxRateWithoutName
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges


class TaxRateService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_tax_rate(self, *, conn: asyncpg.Connection, tax_rate: TaxRate) -> TaxRate:
        row = await conn.fetchrow(
            "insert into tax (name, rate, description) values ($1, $2, $3) returning name, rate, description",
            tax_rate.name,
            tax_rate.rate,
            tax_rate.description,
        )

        return TaxRate.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_tax_rates(self, *, conn: asyncpg.Connection) -> list[TaxRate]:
        cursor = conn.cursor("select * from tax")
        result = []
        async for row in cursor:
            result.append(TaxRate.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_tax_rate(self, *, conn: asyncpg.Connection, tax_rate_name: str) -> Optional[TaxRate]:
        row = await conn.fetchrow("select * from tax where name = $1", tax_rate_name)
        if row is None:
            return None

        return TaxRate.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_tax_rate(
        self, *, conn: asyncpg.Connection, tax_rate_name: str, tax_rate: TaxRateWithoutName
    ) -> Optional[TaxRate]:
        row = await conn.fetchrow(
            "update tax set rate = $2, description = $3 where name = $1 returning name, rate, description",
            tax_rate_name,
            tax_rate.rate,
            tax_rate.description,
        )
        if row is None:
            return None

        return TaxRate.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_tax_rate(self, *, conn: asyncpg.Connection, tax_rate_name: str) -> bool:
        result = await conn.execute(
            "delete from tax where name = $1",
            tax_rate_name,
        )
        return result != "DELETE 0"
