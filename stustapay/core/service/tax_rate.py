from typing import Optional

import asyncpg

from .dbservice import DBService, with_db_transaction
from ..schema.tax_rate import TaxRate, TaxRateWithoutName
from ..schema.user import User


class TaxRateService(DBService):
    @with_db_transaction
    async def create_tax_rate(self, *, conn: asyncpg.Connection, user: User, tax_rate: TaxRate) -> TaxRate:
        del user
        row = await conn.fetchrow(
            "insert into tax (name, rate, description) values ($1, $2, $3) returning name, rate, description",
            tax_rate.name,
            tax_rate.rate,
            tax_rate.description,
        )

        return TaxRate.from_db(row)

    @with_db_transaction
    async def list_tax_rates(self, *, conn: asyncpg.Connection, user: User) -> list[TaxRate]:
        del user
        cursor = conn.cursor("select * from tax")
        result = []
        async for row in cursor:
            result.append(TaxRate.from_db(row))
        return result

    @with_db_transaction
    async def get_tax_rate(self, *, conn: asyncpg.Connection, user: User, tax_rate_name: str) -> Optional[TaxRate]:
        del user
        row = await conn.fetchrow("select * from tax where name = $1", tax_rate_name)
        if row is None:
            return None

        return TaxRate.from_db(row)

    @with_db_transaction
    async def update_tax_rate(
        self, *, conn: asyncpg.Connection, user: User, tax_rate_name: str, tax_rate: TaxRateWithoutName
    ) -> Optional[TaxRate]:
        del user
        row = await conn.fetchrow(
            "update tax set rate = $2, description = $3 where name = $1 returning name, rate, description",
            tax_rate_name,
            tax_rate.rate,
            tax_rate.description,
        )
        if row is None:
            return None

        return TaxRate.from_db(row)

    @with_db_transaction
    async def delete_tax_rate(self, *, conn: asyncpg.Connection, user: User, tax_rate_name: str) -> bool:
        del user
        result = await conn.execute(
            "delete from tax where name = $1",
            tax_rate_name,
        )
        return result != "DELETE 0"
