from typing import Optional

from pydantic import BaseModel


class NewProduct(BaseModel):
    name: str
    price: Optional[float]
    fixed_price: bool = True
    tax_name: str
    target_account_id: Optional[int]


class Product(NewProduct):
    id: int
