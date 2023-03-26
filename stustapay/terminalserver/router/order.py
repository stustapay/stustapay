"""
purchase ordering.
"""

from fastapi import APIRouter, Depends

from stustapay.core.http.auth_till import get_auth_token
from stustapay.core.http.context import get_order_service
from stustapay.core.schema.order import NewOrder
from stustapay.core.service.order import OrderService

router = APIRouter(prefix="/order", tags=["order"])


@router.post("/create", summary="create and execute new order")
async def create(
    order: NewOrder,
    token: str = Depends(get_auth_token),
    order_service: OrderService = Depends(get_order_service),
):
    """
    Execute the order.
    returns either the completed order, or an error message, why the order could not be completed
    """
    return await order_service.create_order(token=token, new_order=order)


@router.get("/{order_id}", summary="get information about an order")
async def show(
    order_id: int,
    token: str = Depends(get_auth_token),
    order_service: OrderService = Depends(get_order_service),
):
    return await order_service.show_order(token=token, order_id=order_id)


@router.get("/{order_id}/process", summary="finish the order and book the transactions")
async def process(
    order_id: int,
    token: str = Depends(get_auth_token),
    order_service: OrderService = Depends(get_order_service),
):
    return await order_service.book_order(token=token, order_id=order_id)
