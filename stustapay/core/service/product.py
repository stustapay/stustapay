from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user_privileges


class ProductService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_product(self, *, conn: asyncpg.Connection, product: NewProduct) -> Product:
        row = await conn.fetchrow(
            "insert into product (name, price, tax_name, target_account_id, fixed_price, price_in_vouchers) "
            "values ($1, $2, $3, $4, $5, $6) "
            "returning id, name, price, tax_name, target_account_id, fixed_price, price_in_vouchers",
            product.name,
            product.price,
            product.tax_name,
            product.target_account_id,
            product.fixed_price,
            product.price_in_vouchers,
        )

        return Product.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_products(self, *, conn: asyncpg.Connection) -> list[Product]:
        cursor = conn.cursor("select * from product")
        result = []
        async for row in cursor:
            result.append(Product.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_product(self, *, conn: asyncpg.Connection, product_id: int) -> Optional[Product]:
        row = await conn.fetchrow("select * from product where id = $1", product_id)
        if row is None:
            return None

        return Product.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_product(
        self, *, conn: asyncpg.Connection, product_id: int, product: NewProduct
    ) -> Optional[Product]:
        row = await conn.fetchrow(
            "update product set name = $2, price = $3, tax_name = $4, target_account_id = $5, fixed_price = $6, "
            "price_in_vouchers = $7 "
            "where id = $1 "
            "returning id, name, price, tax_name, target_account_id, fixed_price, price_in_vouchers",
            product_id,
            product.name,
            product.price,
            product.tax_name,
            product.target_account_id,
            product.fixed_price,
            product.price_in_vouchers,
        )
        if row is None:
            return None

        return Product.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_product(self, *, conn: asyncpg.Connection, product_id: int) -> bool:
        result = await conn.execute(
            "delete from product where id = $1",
            product_id,
        )
        return result != "DELETE 0"
