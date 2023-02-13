from dataclasses import dataclass


@dataclass
class NewProduct:
    name: str
    price: float
    tax: str


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
        )
