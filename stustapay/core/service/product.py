from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.product import NewProduct, Product, ProductType
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import NotFound, ServiceException
from stustapay.framework.database import Connection


async def fetch_product(
    *, conn: Connection, node: Node, product_id: int, product_type: ProductType = ProductType.user_defined
) -> Optional[Product]:
    return await conn.fetch_maybe_one(
        Product,
        "select * from product_with_tax_and_restrictions where id = $1 and type = $3 and node_id = any($2)",
        product_id,
        node.ids_to_event_node,
        product_type.name,
    )


async def fetch_constant_product(*, conn: Connection, node: Node, product_type: ProductType) -> Product:
    product = await conn.fetch_maybe_one(
        Product,
        "select * from product_with_tax_and_restrictions where type = $1 and node_id = any($2)",
        product_type.name,
        node.ids_to_event_node,
    )
    if product is None:
        raise RuntimeError("no product found in database")
    return product


async def fetch_discount_product(*, conn: Connection, node: Node) -> Product:
    return await fetch_constant_product(conn=conn, node=node, product_type=ProductType.discount)


async def fetch_top_up_product(*, conn: Connection, node: Node) -> Product:
    return await fetch_constant_product(conn=conn, node=node, product_type=ProductType.topup)


async def fetch_pay_out_product(*, conn: Connection, node: Node) -> Product:
    return await fetch_constant_product(conn=conn, node=node, product_type=ProductType.payout)


async def fetch_money_transfer_product(*, conn: Connection, node: Node) -> Product:
    return await fetch_constant_product(conn=conn, node=node, product_type=ProductType.money_transfer)


async def fetch_money_difference_product(*, conn: Connection, node: Node) -> Product:
    return await fetch_constant_product(conn=conn, node=node, product_type=ProductType.imbalance)


class ProductIsLockedException(ServiceException):
    id = "ProductNotEditable"
    description = "The product has been marked as not editable, its core metadata is therefore fixed"


class ProductService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(object_types=[ObjectType.product], event_only=True)
    @requires_user([Privilege.node_administration])
    async def create_product(self, *, conn: Connection, node: Node, product: NewProduct) -> Product:
        product_id = await conn.fetchval(
            "insert into product "
            "(node_id, name, price, tax_rate_id, target_account_id, fixed_price, price_in_vouchers, is_locked, "
            "is_returnable, type) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'user_defined') "
            "returning id",
            node.id,
            product.name,
            product.price,
            product.tax_rate_id,
            product.target_account_id,
            product.fixed_price,
            product.price_in_vouchers,
            product.is_locked,
            product.is_returnable,
        )

        for restriction in product.restrictions:
            await conn.execute(
                "insert into product_restriction (id, restriction) values ($1, $2)", product_id, restriction.name
            )

        assert product_id is not None
        created_product = await fetch_product(conn=conn, node=node, product_id=product_id)
        assert created_product is not None
        return created_product

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user()
    async def list_products(self, *, conn: Connection, node: Node) -> list[Product]:
        return await conn.fetch_many(
            Product,
            "select * from product_with_tax_and_restrictions where node_id = any($1) and type = 'user_defined' "
            "order by name",
            node.ids_to_event_node,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user()
    async def get_product(self, *, conn: Connection, node: Node, product_id: int) -> Optional[Product]:
        return await fetch_product(conn=conn, node=node, product_id=product_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.product], event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_product(self, *, conn: Connection, node: Node, product_id: int, product: NewProduct) -> Product:
        current_product = await fetch_product(conn=conn, node=node, product_id=product_id)
        if current_product is None:
            raise NotFound(element_typ="product", element_id=product_id)

        if current_product.is_locked:
            if any(
                [
                    current_product.price != product.price,
                    current_product.fixed_price != product.fixed_price,
                    current_product.price_in_vouchers != product.price_in_vouchers,
                    current_product.target_account_id != product.target_account_id,
                    current_product.tax_rate_id != product.tax_rate_id,
                    current_product.restrictions != product.restrictions,
                    current_product.is_locked != product.is_locked,
                    current_product.is_returnable != product.is_returnable,
                ]
            ):
                raise ProductIsLockedException()

        row = await conn.fetchrow(
            "update product set name = $2, price = $3, tax_rate_id = $4, target_account_id = $5, fixed_price = $6, "
            "price_in_vouchers = $7, is_locked = $8, is_returnable = $9 "
            "where id = $1 "
            "returning id",
            product_id,
            product.name,
            product.price,
            product.tax_rate_id,
            product.target_account_id,
            product.fixed_price,
            product.price_in_vouchers,
            product.is_locked,
            product.is_returnable,
        )
        if row is None:
            raise RuntimeError("product disappeared unexpecteldy within a transaction")

        await conn.execute("delete from product_restriction where id = $1", product_id)
        for restriction in product.restrictions:
            await conn.execute(
                "insert into product_restriction (id, restriction) values ($1, $2)", product_id, restriction.name
            )

        updated_product = await fetch_product(conn=conn, node=node, product_id=product_id)
        assert updated_product is not None
        return updated_product

    @with_db_transaction
    @requires_node(object_types=[ObjectType.product], event_only=True)
    @requires_user([Privilege.node_administration])
    async def delete_product(self, *, conn: Connection, node: Node, product_id: int) -> bool:
        result = await conn.execute(
            "delete from product where id = $1 and type = 'user_defined' and node_id = any($2)",
            product_id,
            node.ids_to_event_node,
        )
        return result != "DELETE 0"
