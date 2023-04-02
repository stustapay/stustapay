from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCashierService
from stustapay.core.schema.cashier import Cashier

router = APIRouter(
    prefix="/cashiers",
    tags=["cashiers"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Cashier])
async def list_accounts(token: CurrentAuthToken, cashier_service: ContextCashierService):
    return await cashier_service.list_cashiers(token=token)
