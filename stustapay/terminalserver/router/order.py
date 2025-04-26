"""
purchase ordering.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import (
    CompletedPayOut,
    CompletedSale,
    CompletedTicketSale,
    CompletedTopUp,
    NewPayOut,
    NewSale,
    NewTicketSale,
    NewTopUp,
    Order,
    PendingPayOut,
    PendingSale,
    PendingTicketSale,
    PendingTopUp,
)
from stustapay.core.schema.ticket import (
    NewTicketScan,
    TicketScanResult,
)
from stustapay.core.service.common.decorators import with_perf_measurement

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
@with_perf_measurement(log_template="book_sale inside http takes: {avg_duration}")
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
async def book_topup(
    topup: NewTopUp,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_topup(token=token, new_topup=topup)


@router.post(
    "/register-pending-topup",
    summary="Register a pending topup with the server where the sumup payment is still pending",
    response_model=CompletedTopUp,
)
async def register_pending_topup(
    topup: NewTopUp,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_topup(token=token, new_topup=topup, pending=True)


class CancelOrderPayload(BaseModel):
    order_uuid: UUID


@router.post(
    "/cancel-pending-topup",
    summary="Mark a pending topup as cancelled, e.g. because the sumup booking failed",
)
async def cancel_pending_topup(
    payload: CancelOrderPayload,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
) -> None:
    await order_service.cancel_pending_order(token=token, order_uuid=payload.order_uuid)


@router.post("/check-ticket-scan", summary="check if a ticket sale is valid", response_model=TicketScanResult)
async def check_ticket_scan(
    ticket_scan: NewTicketScan,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.check_ticket_scan(token=token, new_ticket_scan=ticket_scan)


@router.post("/check-ticket-sale", summary="check if a ticket sale is valid", response_model=PendingTicketSale)
async def check_ticket_sale(
    ticket_sale: NewTicketSale,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.check_ticket_sale(token=token, new_ticket_sale=ticket_sale)


@router.post(
    "/book-ticket-sale", summary="finish a ticket sale and book the transactions", response_model=CompletedTicketSale
)
async def book_ticket_sale(
    ticket_sale: NewTicketSale,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_ticket_sale(token=token, new_ticket_sale=ticket_sale)


@router.post(
    "/register-pending-ticket-sale",
    summary="Register a pending topup with the server where the sumup payment is still pending",
    response_model=CompletedTicketSale,
)
async def register_pending_ticket_sale(
    ticket_sale: NewTicketSale,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_ticket_sale(token=token, new_ticket_sale=ticket_sale, pending=True)


@router.post(
    "/cancel-pending-ticket-sale",
    summary="Mark a pending ticket sale as cancelled, e.g. because the sumup booking failed",
)
async def cancel_pending_ticket_sale(
    payload: CancelOrderPayload,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
) -> None:
    await order_service.cancel_pending_order(token=token, order_uuid=payload.order_uuid)


@router.post("/check-payout", summary="check if a pay out is valid", response_model=PendingPayOut)
async def check_payout(
    pay_out: NewPayOut,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.check_pay_out(token=token, new_pay_out=pay_out)


@router.post("/book-payout", summary="finish the pay out and book the transactions", response_model=CompletedPayOut)
async def book_payout(
    payout: NewPayOut,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.book_pay_out(token=token, new_pay_out=payout)


@router.post("/{order_id}/cancel", summary="cancel information about an order")
async def cancel_order(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    await order_service.cancel_sale(token=token, order_id=order_id)


@router.get("/{order_id}", summary="get information about an order", response_model=Optional[Order])
async def show(
    order_id: int,
    token: CurrentAuthToken,
    order_service: ContextOrderService,
):
    return await order_service.show_order(token=token, order_id=order_id)
