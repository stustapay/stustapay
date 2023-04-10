import enum
from typing import Optional

from pydantic import BaseModel


DISCOUNT_PRODUCT_ID = 1


class ProductRestriction(enum.Enum):
    under_16 = "under_16"
    under_18 = "under_18"


class NewProduct(BaseModel):
    name: str
    price: Optional[float]
    fixed_price: bool = True
    price_in_vouchers: Optional[int] = None
    tax_name: str
    restrictions: list[ProductRestriction] = []
    is_locked: bool = False

    target_account_id: Optional[int] = None

    @property
    def price_per_voucher(self) -> Optional[float]:
        if self.price_in_vouchers is None or self.price is None:
            return None

        return self.price / self.price_in_vouchers


class Product(NewProduct):
    id: int
    tax_rate: float
