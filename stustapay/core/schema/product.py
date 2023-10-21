import enum
from typing import Optional

from pydantic import BaseModel


class ProductRestriction(enum.Enum):
    under_16 = "under_16"
    under_18 = "under_18"


class ProductType(enum.Enum):
    discount = "discount"
    topup = "topup"
    payout = "payout"
    money_transfer = "money_transfer"
    imbalance = "imbalance"
    user_defined = "user_defined"
    ticket = "ticket"


class NewProduct(BaseModel):
    name: str
    price: Optional[float]
    fixed_price: bool = True
    price_in_vouchers: Optional[int] = None
    tax_rate_id: int
    restrictions: list[ProductRestriction] = []
    is_locked: bool = False
    is_returnable: bool = False

    target_account_id: Optional[int] = None


class Product(NewProduct):
    node_id: int
    id: int
    tax_name: str
    tax_rate: float
    fixed_price: bool
    type: ProductType
    price_per_voucher: Optional[float] = None
    restrictions: list[ProductRestriction]
    is_locked: bool
    is_returnable: bool
