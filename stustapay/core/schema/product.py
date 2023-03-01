from typing import Optional

from pydantic import BaseModel


class NewProduct(BaseModel):
    name: str
    price: float
    tax: str
    target_account: Optional[int]
    child_product_ids: list[int] = []


class Product(NewProduct):
    id: int
