from datetime import datetime

from fastapi import APIRouter, Query

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
async def list_sumup_transactions(
    token: CurrentAuthToken,
    sumup_service: ContextSumUpService,
    node_id: int,
    limit: int = Query(default=200, ge=1, le=1000),
    transaction_code: str | None = None,
    newest_time: datetime | None = None,
):
    return await sumup_service.list_transactions(
        token=token,
        node_id=node_id,
        limit=limit,
        transaction_code=transaction_code,
        newest_time=newest_time,
    )


@router.get("/checkouts/{checkout_id}", response_model=SumUpCheckout)
async def get_sumup_checkout(
    checkout_id: str, token: CurrentAuthToken, sumup_service: ContextSumUpService, node_id: int
):
    return await sumup_service.get_checkout(token=token, checkout_id=checkout_id, node_id=node_id)
