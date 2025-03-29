from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.product import ProductRestriction


def format_user_tag_uid(uid: Optional[int]) -> Optional[str]:
    if uid is None:
        return None

    return hex(uid)[2:].upper()


class UserTag(BaseModel):
    uid: int


class UserTagScan(BaseModel):
    """a scanned tag before ticket sale"""

    tag_uid: int
    tag_pin: str

    # requested custom top up amount
    top_up_amount: float = 0.0
    # ticket_voucher token via qr code
    voucher_token: Optional[str] = None


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
    secret_id: int
