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
            "insert into product (name, price, tax, target_account) values ($1, $2, $3, $4) "
            "returning id, name, price, tax, target_account",
            product.name,
            product.price,
            product.tax,
            product.target_account,
        )

        for child_id in product.child_product_ids:
            await conn.execute(
                "insert into product_children (product_id, child_id) values ($1, $2)", row["id"], child_id
            )

        updated = await conn.fetchrow("select * from products_with_children where id = $1", row["id"])
        return Product.parse_obj(updated)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_products(self, *, conn: asyncpg.Connection) -> list[Product]:
        cursor = conn.cursor("select * from products_with_children")
        result = []
        async for row in cursor:
            result.append(Product.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_product(self, *, conn: asyncpg.Connection, product_id: int) -> Optional[Product]:
        row = await conn.fetchrow("select * from products_with_children where id = $1", product_id)
        if row is None:
            return None

        return Product.parse_obj(row)

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

        await conn.execute("delete from product_children where product_id = $1", product_id)

        for child_id in product.child_product_ids:
            await conn.execute(
                "insert into product_children (product_id, child_id) values ($1, $2)", row["id"], child_id
            )

        updated = await conn.fetchrow("select * from products_with_children where id = $1", row["id"])
        return Product.parse_obj(updated)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def delete_product(self, *, conn: asyncpg.Connection, product_id: int) -> bool:
        result = await conn.execute(
            "delete from product where id = $1",
            product_id,
        )
        return result != "DELETE 0"
