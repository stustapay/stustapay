from fastapi import APIRouter, status, HTTPException

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.schema.till import CashRegisterStocking, NewCashRegisterStocking

router = APIRouter(
    prefix="/till-register-stockings",
    tags=["till-register-stockings"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[CashRegisterStocking])
async def list_register_stockings(token: CurrentAuthToken, till_service: ContextTillService):
    return await till_service.register.list_cash_register_stockings_admin(token=token)


@router.post("/", response_model=CashRegisterStocking)
async def create_register_stocking(
    stocking: NewCashRegisterStocking,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.register.create_cash_register_stockings(token=token, stocking=stocking)


@router.post("/{stocking_id}", response_model=CashRegisterStocking)
async def update_register_stocking(
    stocking_id: int,
    stocking: NewCashRegisterStocking,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    updated = await till_service.register.update_cash_register_stockings(
        token=token, stocking_id=stocking_id, stocking=stocking
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return updated


@router.delete("/{stocking_id}")
async def delete_register_stocking(
    stocking_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    deleted = await till_service.register.delete_cash_register_stockings(token=token, stocking_id=stocking_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
