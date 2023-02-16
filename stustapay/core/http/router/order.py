"""
purchase ordering.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from stustapay.core.http.auth_user import get_current_user
from stustapay.core.http.context import get_order_service
from stustapay.core.schema.order import NewOrder
from stustapay.core.schema.user import User
from stustapay.core.service.order import OrderService

router = APIRouter(
    prefix="/api",
)


class NewOrderPayload(BaseModel):
    order: NewOrder


@router.post("/order/create", summary="create a new order")
async def create(
    payload: NewOrderPayload,
    user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service),
):
    return await order_service.create_order(user=user, order=payload.order)


@router.get("/order/{order_id}", summary="get information about an order")
async def show(
    order_id: int,
    user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service),
):
    return await order_service.show_order(user=user, order_id=order_id)


@router.get("/order/{order_id}/pay", summary="the order is finished, suggest payment options")
async def process(
    order_id: int,
    user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service),
):
    # return status - how it can be payed, e.g. with vouchers.
    return await order_service.order_payment_info(user=user, order_id=order_id)
