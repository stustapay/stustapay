from typing import Optional

from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.http.normalize_data import PaginatedList
from stustapay.core.schema.order import Transaction

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=PaginatedList[Transaction])
async def list_transactions(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    cash_register_id: Optional[int] = None,
    transaction_id: Optional[int] = None,
    offset: int = 0,
    limit: Optional[int] = None,
):
    return await order_service.list_transactions(
        token=token,
        node_id=node_id,
        cash_register_id=cash_register_id,
        transaction_id=transaction_id,
        offset=offset,
        limit=limit,
    )


@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(
    token: CurrentAuthToken, transaction_id: int, order_service: ContextOrderService, node_id: int
):
    return await order_service.get_transaction(token=token, transaction_id=transaction_id, node_id=node_id)
