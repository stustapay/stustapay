from dataclasses import dataclass

from stustapay.core.schema.product import Product

# Global Account IDs for virtual accounts
# The virtual accounts are all fixed in the database
ACCOUNT_SALE_EXIT = 0
ACCOUNT_SALE_ENTRY = 1
ACCOUNT_DEPOSIT = 2
ACCOUNT_SUMUP = 3
ACCOUNT_CASH_VAULT = 4


def get_source_account(order_type: str, product: Product, customer_account: int):
    """
    return the transaction source account, depending on the order type or sold product
    """
    del product
    if order_type == "sale":
        return customer_account
    raise NotImplementedError()


def get_target_account(order_type: str, product: Product, customer_account: int):
    """
    return the transaction target account, depending on the order type or sold product
    """
    del customer_account
    if order_type == "sale":
        if product.target_account is not None:
            return product.target_account
        return ACCOUNT_SALE_EXIT
    raise NotImplementedError()


@dataclass
class Account:
    id: int
    user_tag_id: int
    type: str
    name: str
    comment: str
    balance: float

    @classmethod
    def from_db(cls, row):
        return cls(
            id=row["id"],
            user_tag_id=row["user_tag_id"],
            type=row["type"],
            name=row["name"],
            comment=row["comment"],
            balance=row["balance"],
        )
