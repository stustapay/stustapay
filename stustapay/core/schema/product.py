import enum
from typing import Optional

from pydantic import BaseModel


DISCOUNT_PRODUCT_ID = 1
TOP_UP_PRODUCT_ID = 2
PAY_OUT_PRODUCT_ID = 3
TICKET_PRODUCT_ID = 4
TICKET_U18_PRODUCT_ID = 5
TICKET_U16_PRODUCT_ID = 6
MONEY_TRANSFER_PRODUCT_ID = 7


class ProductRestriction(enum.Enum):
    under_16 = "under_16"
    under_18 = "under_18"


class NewProduct(BaseModel):
    name: str
    price: Optional[float]
    fixed_price: bool = True
    price_in_vouchers: Optional[int] = None
    price_per_voucher: Optional[float] = None
    tax_name: str
    restrictions: list[ProductRestriction] = []
    is_locked: bool = False
    is_returnable: bool = False

    target_account_id: Optional[int] = None


class Product(NewProduct):
    id: int
    tax_rate: float
