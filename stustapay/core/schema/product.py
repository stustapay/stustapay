import enum
from typing import Optional

from pydantic import BaseModel, field_validator


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

    @field_validator("price")
    @classmethod
    def round_price_to_two_decimals(cls, v: Optional[float]) -> Optional[float]:  # pylint: disable=no-self-argument
        """Round price to 2 decimal places to avoid precision issues."""
        if v is None:
            return None
        return round(v * 100) / 100


class Product(NewProduct):
    node_id: int
    id: int
    tax_name: str
    tax_rate: float
    has_bookings: bool = False
    fixed_price: bool
    type: ProductType
    price_per_voucher: Optional[float] = None
    restrictions: list[ProductRestriction]
    is_locked: bool
    is_returnable: bool
