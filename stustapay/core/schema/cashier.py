from typing import Optional

from pydantic import BaseModel


class Cashier(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_tag_id: int
    cash_drawer_balance: float
    till_id: Optional[int]
