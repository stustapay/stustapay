from datetime import datetime

from pydantic import BaseModel

from stustapay.core.schema.order import Order
from stustapay.core.schema.product import Product


class CashierShiftStats(BaseModel):
    class CashierProductStats(BaseModel):
        product: Product
        quantity: int

    booked_products: list[CashierProductStats]
    orders: list[Order]


class CashierShift(BaseModel):
    id: int
    comment: str
    cashier_id: int
    cash_register_id: int | None
    closing_out_user_id: int
    actual_cash_drawer_balance: float
    expected_cash_drawer_balance: float
    cash_drawer_imbalance: float
    started_at: datetime
    ended_at: datetime
