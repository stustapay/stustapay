from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService, ContextTillService
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import Order

router = APIRouter(
    prefix="/customer",
    tags=["customer"],
    responses={404: {"description": "Not found"}},
)


class SwitchTagPayload(BaseModel):
    old_user_tag_pin: str
    new_user_tag_uid: int
    new_user_tag_pin: str
    comment: str


@router.post("/switch_tag", summary="")
async def switch_tag(
    token: CurrentAuthToken,
    payload: SwitchTagPayload,
    account_service: ContextAccountService,
):
    await account_service.switch_account_tag_uid_terminal(
        token=token,
        old_user_tag_pin=payload.old_user_tag_pin,
        new_user_tag_uid=payload.new_user_tag_uid,
        new_user_tag_pin=payload.new_user_tag_pin,
        comment=payload.comment,
    )


@router.get("/{customer_tag_uid}", summary="Obtain a customer by tag uid", response_model=Account)
async def get_customer(
    token: CurrentAuthToken,
    customer_tag_uid: int,
    till_service: ContextTillService,
):
    return await till_service.get_customer(token=token, customer_tag_uid=customer_tag_uid)


@router.get(
    "/{customer_tag_uid}/orders", summary="Obtain all orders of a customer by tag uid", response_model=list[Order]
)
async def get_customer_orders(
    token: CurrentAuthToken,
    customer_tag_uid: int,
    till_service: ContextTillService,
):
    return await till_service.get_customer_orders(token=token, customer_tag_uid=customer_tag_uid)
