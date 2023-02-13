"""
purchase ordering.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from stustapay.core.http.auth_user import get_current_user
from stustapay.core.http.context import get_transaction_service
from stustapay.core.schema.transaction import NewTransaction
from stustapay.core.schema.user import User
from stustapay.core.service.transaction import TransactionService

router = APIRouter(
    prefix="/api",
)


class NewOrderPayload(BaseModel):
    transaction: NewTransaction


@router.post("/order/create", summary="create a new order")
async def create(
    payload: NewOrderPayload,
    user: User = Depends(get_current_user),
    tx_service: TransactionService = Depends(get_transaction_service),
):
    return await tx_service.create_transaction(user=user, transaction=payload.transaction)


@router.get("/order/{order_id}", summary="get information about an order")
async def show(
    order_id: int,
    user: User = Depends(get_current_user),
    tx_service: TransactionService = Depends(get_transaction_service),
):
    return await tx_service.show_transaction(user=user, order_id=order_id)


@router.get("/order/{order_id}/pay", summary="the order is finished, suggest payment options")
async def process(
    order_id: int,
    user: User = Depends(get_current_user),
    tx_service: TransactionService = Depends(get_transaction_service),
):
    # return status - how it can be payed, e.g. with vouchers.
    return await tx_service.transaction_payment_info(user=user, order_id=order_id)
