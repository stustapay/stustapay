import enum
from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.tax_type import TaxType


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
    user_tag_variant_ids: list[int] = []
    is_locked: bool = False
    is_returnable: bool = False

    target_account_id: Optional[int] = None


class Product(NewProduct):
    node_id: int
    id: int
    tax_name: str
    tax_rate: float
    tax_type: TaxType
    fixed_price: bool
    type: ProductType
    price_per_voucher: Optional[float] = None
    user_tag_variant_ids: list[int]
    is_locked: bool
    is_returnable: bool
