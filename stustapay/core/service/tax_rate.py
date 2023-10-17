from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tax_rate import NewTaxRate, TaxRate
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.framework.database import Connection


class TaxRateService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    @requires_node()
    async def create_tax_rate(self, *, conn: Connection, node: Node, tax_rate: NewTaxRate) -> TaxRate:
        # TODO: TREE visibility
        return await conn.fetch_one(
            TaxRate,
            "insert into tax (node_id, name, rate, description) "
            "values ($1, $2, $3, $4) "
            "returning node_id, name, rate, description",
            node.id,
            tax_rate.name,
            tax_rate.rate,
            tax_rate.description,
        )

    @with_db_transaction
    @requires_user()
    @requires_node()
    async def list_tax_rates(self, *, conn: Connection, node: Node) -> list[TaxRate]:
        return await conn.fetch_many(TaxRate, "select * from tax where node_id = any($1)", node.ids_to_event_node)

    @with_db_transaction
    @requires_user()
    @requires_node()
    async def get_tax_rate(self, *, conn: Connection, node: Node, tax_rate_name: str) -> Optional[TaxRate]:
        return await conn.fetch_maybe_one(
            TaxRate, "select * from tax where name = $1 and node_id = any($2)", tax_rate_name, node.ids_to_event_node
        )

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    @requires_node()
    async def update_tax_rate(self, *, conn: Connection, tax_rate_name: str, tax_rate: NewTaxRate) -> Optional[TaxRate]:
        # TODO: TREE visibility
        return await conn.fetch_maybe_one(
            TaxRate,
            "update tax set rate = $2, description = $3 where name = $1 returning node_id, name, rate, description",
            tax_rate_name,
            tax_rate.rate,
            tax_rate.description,
        )

    @with_db_transaction
    @requires_user([Privilege.tax_rate_management])
    @requires_node()
    async def delete_tax_rate(self, *, conn: Connection, tax_rate_name: str) -> bool:
        # TODO: TREE visibility
        result = await conn.execute(
            "delete from tax where name = $1",
            tax_rate_name,
        )
        return result != "DELETE 0"
