from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextSumUpService
from stustapay.payment.sumup.api import SumUpCheckout, SumUpTransaction

router = APIRouter(
    prefix="/sumup",
    tags=["sumup"],
    responses={404: {"description": "Not found"}},
)


@router.get("/checkouts", response_model=list[SumUpCheckout])
async def list_sumup_checkouts(token: CurrentAuthToken, sumup_service: ContextSumUpService, node_id: int):
    return await sumup_service.list_checkouts(token=token, node_id=node_id)


@router.get("/transactions", response_model=list[SumUpTransaction])
async def list_sumup_transactions(token: CurrentAuthToken, sumup_service: ContextSumUpService, node_id: int):
    return await sumup_service.list_transactions(token=token, node_id=node_id)


@router.get("/checkouts/{checkout_id}", response_model=SumUpCheckout)
async def get_sumup_checkout(
    checkout_id: str, token: CurrentAuthToken, sumup_service: ContextSumUpService, node_id: int
):
    return await sumup_service.get_checkout(token=token, checkout_id=checkout_id, node_id=node_id)
