from typing import Optional

import asyncpg

from .dbservice import DBService, with_db_transaction, requires_user_privileges
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.user import Privilege


class ProductService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_product(self, *, conn: asyncpg.Connection, product: NewProduct) -> Product:
        row = await conn.fetchrow(
            "insert into product (name, price, tax, target_account) values ($1, $2, $3, $4) returning id, name, price, tax, target_account",
            product.name,
            product.price,
            product.tax,
            product.target_account,
        )

        return Product.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_products(self, *, conn: asyncpg.Connection) -> list[Product]:
        cursor = conn.cursor("select * from product")
        result = []
        async for row in cursor:
            result.append(Product.from_db(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_product(self, *, conn: asyncpg.Connection, product_id: int) -> Optional[Product]:
        row = await conn.fetchrow("select * from product where id = $1", product_id)
        if row is None:
            return None

        return Product.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_product(
        self, *, conn: asyncpg.Connection, product_id: int, product: NewProduct
    ) -> Optional[Product]:
        row = await conn.fetchrow(
            "update product set name = $2, price = $3, tax = $4 where id = $1 returning id, name, price, tax",
            product_id,
            product.name,
            product.price,
            product.tax,
        )
        if row is None:
            return None

        return Product.from_db(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_product(self, *, conn: asyncpg.Connection, product_id: int) -> bool:
        result = await conn.execute(
            "delete from product where id = $1",
            product_id,
        )
        return result != "DELETE 0"
