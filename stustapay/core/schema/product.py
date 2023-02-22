from dataclasses import dataclass
from typing import Optional


@dataclass
class NewProduct:
    name: str
    price: float
    tax: str
    target_account: Optional[int]


@dataclass
class Product(NewProduct):
    id: int

    @classmethod
    def from_db(cls, row) -> "Product":
        return cls(
            id=row["id"],
            name=row["name"],
            price=row["price"],
            tax=row["tax"],
            target_account=row["target_account"],
        )
