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


@router.post("/order/execute", summary="create and execute new order")
async def execute(
    payload: NewOrderPayload,
    user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service),
):
    """
    Execute the order.
    returns either the completed order, or an error message, why the order could not be completed
    """
    return await order_service.execute_order(current_user=user, new_order=payload.order)


@router.get("/order/{order_id}", summary="get information about an order")
async def show(
    order_id: int,
    user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service),
):
    return await order_service.show_order(current_user=user, order_id=order_id)
