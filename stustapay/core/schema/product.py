from dataclasses import dataclass


@dataclass
class NewProduct:
    name: str
    price: float
    tax: str


@dataclass
class Product:
    id: int
    name: str
    price: float
    tax: str
