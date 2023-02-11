from typing import Optional

import asyncpg

from .dbservice import DBService, with_db_transaction
from ..schema.product import NewProduct, Product
from ..schema.user import User


class ProductService(DBService):
    @with_db_transaction
    async def create_product(self, *, conn: asyncpg.Connection, user: User, product: NewProduct) -> Product:
        row = await conn.fetchrow(
            "insert into product (name, price, tax) " "values ($1, $2, $3) returning id, name, price, tax",
            product.name,
            product.price,
            product.tax,
        )

        return Product(
            id=row["id"],
            name=row["name"],
            price=row["price"],
            tax=row["tax"],
        )

    @with_db_transaction
    async def list_products(self, *, conn: asyncpg.Connection, user: User) -> list[Product]:
        cursor = conn.cursor("select * from product")
        result = []
        async for row in cursor:
            result.append(
                Product(
                    id=row["id"],
                    name=row["name"],
                    price=row["price"],
                    tax=row["tax"],
                )
            )
        return result

    @with_db_transaction
    async def get_product(self, *, conn: asyncpg.Connection, user: User, product_id: int) -> Optional[Product]:
        row = await conn.fetchrow("select * from product where id = $1", product_id)
        if row is None:
            return None

        return Product(
            id=row["id"],
            name=row["name"],
            price=row["price"],
            tax=row["tax"],
        )

    @with_db_transaction
    async def update_product(
        self, *, conn: asyncpg.Connection, product_id: int, user: User, product: NewProduct
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

        return Product(
            id=row["id"],
            name=row["name"],
            price=row["price"],
            tax=row["tax"],
        )

    @with_db_transaction
    async def delete_product(self, *, conn: asyncpg.Connection, user: User, product_id: int) -> bool:
        result = await conn.execute(
            "delete from product where id = $1",
            product_id,
        )
        return result != "DELETE 0"
