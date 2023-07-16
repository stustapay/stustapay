from collections import defaultdict
from datetime import datetime
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import Connection
from stustapay.core.schema.product import Product
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction
from pydantic import BaseModel


class ProductSoldStats(Product):
    quantity_sold: int


class VoucherStats(BaseModel):
    vouchers_issued: int = 0
    vouchers_spent: int = 0


class ProductStats(BaseModel):
    product_quantities: list[ProductSoldStats]
    product_quantities_by_till: dict[int, list[ProductSoldStats]]
    voucher_stats: VoucherStats


class OrderStatsService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def get_product_stats(
        self, *, conn: Connection, from_timestamp: Optional[datetime], to_timestamp: Optional[datetime]
    ) -> ProductStats:
        stats_by_products = await conn.fetch_many(
            ProductSoldStats,
            "select p.*, coalesce(stats.quantity_sold, 0) as quantity_sold "
            "from product_with_tax_and_restrictions p "
            "join ( "
            "   select s.product_id, sum(s.quantity_sold) as quantity_sold "
            "   from product_stats(from_timestamp => $1, to_timestamp => $2) s"
            "   group by s.product_id "
            ") stats on stats.product_id = p.id "
            "order by stats.quantity_sold desc ",
            from_timestamp,
            to_timestamp,
        )

        stats_by_till = await conn.fetch(
            "select p.*, stats.till_id, stats.quantity_sold "
            "from product_with_tax_and_restrictions p "
            "join product_stats(from_timestamp => $1, to_timestamp => $2) stats on p.id = stats.product_id "
            "order by stats.till_id, stats.quantity_sold desc ",
            from_timestamp,
            to_timestamp,
        )

        voucher_stats = await conn.fetch_one(
            VoucherStats,
            "select * from voucher_stats(from_timestamp => $1, to_timestamp => $2)",
            from_timestamp,
            to_timestamp,
        )

        product_quantities_by_till = defaultdict(list)
        for row in stats_by_till:
            product_quantities_by_till[row["till_id"]].append(ProductSoldStats.model_validate(dict(row)))

        return ProductStats(
            product_quantities=stats_by_products,
            product_quantities_by_till=product_quantities_by_till,
            voucher_stats=voucher_stats,
        )
