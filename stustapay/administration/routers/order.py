from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import Order

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Order])
async def list_accounts(token: CurrentAuthToken, order_service: ContextOrderService):
    return await order_service.list_orders(token=token)
