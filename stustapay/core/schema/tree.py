import enum
from typing import Optional

from pydantic import BaseModel


class ObjectType(enum.Enum):
    user = "user"
    product = "product"
    ticket = "ticket"
    till = "till"
    user_role = "user_role"
    account = "account"
    order = "order"
    user_tags = "user_tags"
    tax_rate = "tax_rate"
    tse = "tse"


class Node(BaseModel):
    id: int
    parent: Optional[int]
    name: str
    description: str
    path: str
    parent_ids: list[int]
    allowed_objects_at_node: list[ObjectType]
    # TODO: not relevant for now, for ui allowed_objects_at_node should be enough
    # allowed_objects_in_subtree: list[ObjectType]
    children: list["Node"]
