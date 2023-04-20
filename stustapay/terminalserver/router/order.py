"""
purchase ordering.
"""
from typing import Optional

from fastapi import APIRouter

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import (
    CompletedSale,
    NewSale,
    Order,
    PendingSale,
    NewTopUp,
    PendingTopUp,
    CompletedTopUp,
)

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


@router.post("/check-sale", summary="check if a sale is valid", response_model=PendingSale)
async def check_sale(
    sale: NewSale,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.check_sale(token=token, new_sale=sale)


@router.post("/book-sale", summary="finish the sale and book the transactions", response_model=CompletedSale)
async def book_sale(
    sale: NewSale,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_sale(token=token, new_sale=sale)


@router.post("/check-topup", summary="check if a top up is valid", response_model=PendingTopUp)
async def check_topup(
    topup: NewTopUp,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.check_topup(token=token, new_topup=topup)


@router.post("/book-topup", summary="finish the top up and book the transactions", response_model=CompletedTopUp)
async def book(
    topup: NewTopUp,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_topup(token=token, new_topup=topup)


@router.get("/{order_id}", summary="get information about an order", response_model=Optional[Order])
async def show(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.show_order(token=token, order_id=order_id)
