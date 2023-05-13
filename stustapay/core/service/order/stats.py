import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.product import Product
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user
from stustapay.core.util import BaseModel


class ProductSoldStats(Product):
    quantity_sold: int


class ProductStats(BaseModel):
    ten_most_sold_products: list[ProductSoldStats]


class OrderStatsService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def get_product_stats(self, *, conn: asyncpg.Connection) -> ProductStats:
        rows = await conn.fetch("select * from product_stats order by quantity_sold desc limit 10")

        return ProductStats(ten_most_sold_products=[ProductSoldStats.parse_obj(row) for row in rows])
