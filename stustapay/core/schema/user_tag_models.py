from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserTagAccountAssociation(BaseModel):
    account_id: int
    mapping_was_valid_until: datetime


class UserTagDetail(BaseModel):
    id: int
    pin: str
    uid: Optional[int]
    node_id: int

    comment: Optional[str] = None
    account_id: Optional[int] = None
    user_id: Optional[int] = None
    is_vip: bool = False

    account_history: list[UserTagAccountAssociation] 