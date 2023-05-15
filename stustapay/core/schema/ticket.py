from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.product import ProductRestriction


class NewTicket(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: int
    initial_top_up_amount: float
    restriction: Optional[ProductRestriction] = None


class Ticket(NewTicket):
    id: int
    product_name: str
    price: float
    tax_name: str
    tax_rate: float
    total_price: float
