from pydantic import BaseModel

from stustapay.core.schema.product import ProductRestriction


class NewTicket(BaseModel):
    name: str
    price: float
    tax_rate_id: int
    restrictions: list[ProductRestriction]
    is_locked: bool
    initial_top_up_amount: float


class Ticket(NewTicket):
    node_id: int
    id: int

    tax_name: str
    tax_rate: float
    total_price: float
