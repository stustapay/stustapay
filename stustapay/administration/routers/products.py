from typing import List

import asyncpg
from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel

from stustapay.core.http.context import get_db_conn

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)


class ProductBase(BaseModel):
    name: str

    class Config:
        schema_extra = {"example": {"name": "Helles 0,5l"}}


class ProductIn(ProductBase):
    pass


class ProductOut(ProductBase):
    id: int

    class Config:
        schema_extra = {"example": {"id": 10, "name": "Helles 0,5l"}}


@router.get("/", response_model=List[ProductOut])
async def list_products(conn: asyncpg.Connection = Depends(get_db_conn)):
    rows = await conn.fetch("select * from product")
    return [ProductOut(id=row["id"], name=row["name"]) for row in rows]


@router.post("/", response_model=ProductOut)
async def create_product(product: ProductIn, conn: asyncpg.Connection = Depends(get_db_conn)):
    async with conn.transaction():
        row = await conn.fetchrow("insert into product (name) values ($1) returning id, name", product.name)
        if row is None:
            raise Exception("product insert failed")

        return ProductOut(id=row["id"], name=row["name"])


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, conn: asyncpg.Connection = Depends(get_db_conn)):
    row = await conn.fetchrow("select * from product where id = $1", product_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return ProductOut(id=row["id"], name=row["name"])


@router.post("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, product: ProductIn, conn: asyncpg.Connection = Depends(get_db_conn)):
    async with conn.transaction():
        row = await conn.fetchrow("update product set name = $2 where id = $1", product_id, product.name)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return ProductOut(id=row["id"], name=row["name"])
