from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCashierService
from stustapay.core.schema.cashier import Cashier, CashierShift, CashierShiftStats
from stustapay.core.service.cashier import CloseOutResult, CloseOut

router = APIRouter(
    prefix="/cashiers",
    tags=["cashiers"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Cashier])
async def list_cashiers(token: CurrentAuthToken, cashier_service: ContextCashierService):
    return await cashier_service.list_cashiers(token=token)


@router.get("/{cashier_id}", response_model=Cashier)
async def get_cashier(token: CurrentAuthToken, cashier_id: int, cashier_service: ContextCashierService):
    cashier = await cashier_service.get_cashier(token=token, cashier_id=cashier_id)
    if not cashier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return cashier


@router.get("/{cashier_id}/shifts", response_model=list[CashierShift])
async def get_cashier_shifts(token: CurrentAuthToken, cashier_id: int, cashier_service: ContextCashierService):
    return await cashier_service.get_cashier_shifts(token=token, cashier_id=cashier_id)


@router.get("/{cashier_id}/shift-stats", response_model=CashierShiftStats)
async def get_cashier_shift_stats(
    token: CurrentAuthToken, cashier_id: int, cashier_service: ContextCashierService, shift_id: Optional[int] = None
):
    return await cashier_service.get_cashier_shift_stats(token=token, cashier_id=cashier_id, shift_id=shift_id)


@router.post("/{cashier_id}/close-out", response_model=CloseOutResult)
async def close_out_cashier(
    token: CurrentAuthToken, cashier_id: int, close_out: CloseOut, cashier_service: ContextCashierService
):
    return await cashier_service.close_out_cashier(token=token, cashier_id=cashier_id, close_out=close_out)
