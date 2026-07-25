from typing import Optional

from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCashierService
from stustapay.core.schema.cashier import CashierShift, CashierShiftStats
from stustapay.core.service.cashier import CloseOut, CloseOutResult

router = APIRouter(
    prefix="/cashiers",
    tags=["cashiers"],
    responses={404: {"description": "Not found"}},
)


@router.get("/shifts", response_model=list[CashierShift])
async def list_cashier_shifts(
    token: CurrentAuthToken,
    cashier_service: ContextCashierService,
    node_id: int,
    cashier_id: Optional[int] = None,
    cash_register_id: Optional[int] = None,
    shift_id: Optional[int] = None,
):
    return await cashier_service.get_cashier_shifts(
        token=token,
        node_id=node_id,
        cashier_id=cashier_id,
        cash_register_id=cash_register_id,
        shift_id=shift_id,
    )


@router.get("/{cashier_id}/shift-stats", response_model=CashierShiftStats)
async def get_cashier_shift_stats(
    token: CurrentAuthToken,
    cashier_id: int,
    cashier_service: ContextCashierService,
    node_id: int,
    shift_id: Optional[int] = None,
):
    return await cashier_service.get_cashier_shift_stats(
        token=token, cashier_id=cashier_id, shift_id=shift_id, node_id=node_id
    )


@router.post("/{cashier_id}/close-out", response_model=CloseOutResult)
async def close_out_cashier(
    token: CurrentAuthToken,
    cashier_id: int,
    close_out: CloseOut,
    cashier_service: ContextCashierService,
    node_id: int,
):
    return await cashier_service.close_out_cashier(
        token=token, cashier_id=cashier_id, close_out=close_out, node_id=node_id
    )
