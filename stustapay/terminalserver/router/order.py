"""
purchase ordering.
"""
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import CompletedOrder, NewOrder, Order, PendingOrder

router = APIRouter(prefix="/api", tags=["orders"])


class NewOrderPayload(BaseModel):
    order: NewOrder


@router.get("/order", summary="list all orders", response_model=list[Order])
async def list_orders(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    """
    List all the order of the currently logged in Cashier
    """
    return await order_service.list_orders_terminal(token=token)


@router.get("/order/{order_id}", summary="get information about an order", response_model=Optional[Order])
async def show(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.show_order(token=token, order_id=order_id)


@router.post("/order/create", summary="create and execute new order", response_model=PendingOrder)
async def create(
    payload: NewOrderPayload,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    """
    Execute the order.
    returns either the completed order, or an error message, why the order could not be completed
    """
    return await order_service.create_order(token=token, new_order=payload.order)


@router.get(
    "/order/{order_id}/process", summary="finish the order and book the transactions", response_model=CompletedOrder
)
async def process(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_order(token=token, order_id=order_id)
