from dataclasses import dataclass


@dataclass
class NewPosition:
    product_id: int
    quantity: int


@dataclass
class NewTransaction:
    positions: list[NewPosition]


@dataclass
class TransactionBooking:
    value_sum: float
    value_tax: float
    value_notax: float


@dataclass
class Transaction:
    id: int
