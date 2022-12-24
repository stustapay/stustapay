from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["products"])


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


products: List[ProductOut] = []
next_product_id = 1


@router.get("/", response_model=List[ProductOut])
def list_products():
    return products


@router.post("/", response_model=ProductOut)
def create_product(product: ProductIn):
    global next_product_id
    product_id = next_product_id
    next_product_id = next_product_id + 1
    p = ProductOut(id=product_id, name=product.name)
    products.append(p)

    return p
