from fastapi import APIRouter, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.util import BaseModel

router = APIRouter(
    prefix="",
    tags=["cashier"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


class CashierAccountChangePayload(BaseModel):
    cashier_tag_uid: int
    amount: float


@router.post(
    "/change-cash-register-balance",
    summary="update the balance of a cash register by transferring money from / to a orga transport account",
)
async def change_cash_register_balance(
    token: CurrentAuthToken, till_service: ContextTillService, payload: CashierAccountChangePayload
):
    return await till_service.register.modify_cashier_account_balance(
        token=token, cashier_tag_uid=payload.cashier_tag_uid, amount=payload.amount
    )


class TransportAccountChangePayload(BaseModel):
    orga_tag_uid: int
    amount: float


@router.post(
    "/change-transport-register-balance",
    summary="update the balance of a transport account by transferring money from / to the cash vault",
)
async def change_transport_account_balance(
    token: CurrentAuthToken, till_service: ContextTillService, payload: TransportAccountChangePayload
):
    return await till_service.register.modify_transport_account_balance(
        token=token, orga_tag_uid=payload.orga_tag_uid, amount=payload.amount
    )
