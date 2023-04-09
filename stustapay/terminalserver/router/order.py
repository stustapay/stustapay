"""
purchase ordering.
"""
from typing import Optional

from fastapi import APIRouter

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import CompletedOrder, NewOrder, Order, PendingOrder

router = APIRouter(prefix="/order", tags=["order"])


@router.get("", summary="list all orders", response_model=list[Order])
async def list_orders(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    """
    List all the order of the currently logged in Cashier
    """
    return await order_service.list_orders_terminal(token=token)


@router.post("/check", summary="create a new order and prepare it to be processed", response_model=PendingOrder)
async def check(
    order: NewOrder,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    """
    Execute the order.
    returns either the completed order, or an error message, why the order could not be completed
    """
    return await order_service.check_order(token=token, new_order=order)


@router.post("/book", summary="finish the order and book the transactions", response_model=CompletedOrder)
async def book(
    order: NewOrder,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_order(token=token, new_order=order)


@router.get("/{order_id}", summary="get information about an order", response_model=Optional[Order])
async def show(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.show_order(token=token, order_id=order_id)
