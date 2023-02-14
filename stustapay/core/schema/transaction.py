import datetime
from dataclasses import dataclass

from stustapay.core.schema.product import Product


@dataclass
class NewLineItem:
    product_id: int
    quantity: int


@dataclass
class NewTransaction:
    positions: list[NewLineItem]


@dataclass
class LineItem(NewLineItem):
    txid: int
    itemid: int
    product: Product
    price: float
    price_brutto: float
    price_sum: float
    tax_name: str
    tax_rate: float

    @classmethod
    def from_db(cls, row) -> "LineItem":
        return cls(
            txid=row["txid"],
            itemid=row["itemid"],
            product_id=row["productid"],
            product=Product.from_db(row),
            quantity=row["quantity"],
            price=row["price"],
            price_brutto=row["price"] * (1 + row["tax_rate"]),
            price_sum=row["price"] * (1 + row["tax_rate"]) * row["quantity"],
            tax_name=row["tax_name"],
            tax_rate=row["tax_rate"],
        )


@dataclass
class TransactionBooking:
    value_sum: float
    value_tax: float
    value_notax: float


@dataclass
class TransactionID:
    id: int


@dataclass
class Account:
    name: str
    balance: float


@dataclass
class Transaction(TransactionBooking):
    """
    represents a completely finished transaction with all relevant data
    """

    id: int
    itemcount: int
    created_at: datetime.datetime
    finished_at: datetime.datetime
    txmethod: str
    line_items: list[LineItem]

    # TODO how to handle foreign keys
    # source_account: Account
    # target_account: Account
    # cashierid: User
    # terminalid: Terminal

    @classmethod
    def from_db(cls, row, line_items) -> "Transaction":
        return cls(
            id=row["id"],
            itemcount=row["itemcount"],
            created_at=row["created_at"],
            finished_at=row["finished_at"],
            txmethod=row["txmethod"],
            value_sum=row["value_sum"],
            value_tax=row["value_tax"],
            value_notax=row["value_notax"],
            line_items=line_items,
        )
