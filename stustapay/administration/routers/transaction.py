from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import Transaction

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(
    token: CurrentAuthToken, transaction_id: int, order_service: ContextOrderService, node_id: int
):
    return await order_service.get_transaction(token=token, transaction_id=transaction_id, node_id=node_id)
