from pydantic import BaseModel

from stustapay.core.schema.product import ProductRestriction


class NewUserTagSecret(BaseModel):
    key0: str
    key1: str
    description: str


class UserTagSecret(NewUserTagSecret):
    id: int
    node_id: int


class NewUserTag(BaseModel):
    pin: str
    restriction: ProductRestriction | None = None
    secret_id: int | None = None
