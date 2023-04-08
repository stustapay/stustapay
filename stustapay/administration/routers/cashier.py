from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCashierService
from stustapay.core.schema.cashier import Cashier

router = APIRouter(
    prefix="/cashiers",
    tags=["cashiers"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Cashier])
async def list_cashiers(token: CurrentAuthToken, cashier_service: ContextCashierService):
    return await cashier_service.list_cashiers(token=token)


@router.get("/{cashier_id}", response_model=Cashier)
async def get_cashier(token: CurrentAuthToken, cashier_id: int, cashier_service: ContextCashierService):
    cashier = await cashier_service.get_cashier(token=token, cashier_id=cashier_id)
    if not cashier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return cashier
