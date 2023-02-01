"""
purchase ordering.
"""

from fastapi import APIRouter, Depends

from pydantic import BaseModel

from ...schema.transaction import NewTransaction
from ..context import get_context, Context


router = APIRouter(
    prefix="/api",
)


class NewOrderPayload(BaseModel):
    transaction: NewTransaction


@router.post("/order/create", summary="create a new order")
async def create(payload: NewOrderPayload, ctx: Context = Depends(get_context)):
    return await ctx.tx_service.create_transaction(payload.transaction)


@router.get("/order/{order_id}", summary="get information about an order")
async def show(order_id: int, ctx: Context = Depends(get_context)):
    return await ctx.tx_service.show_transaction(order_id)


@router.get("/order/{order_id}/pay", summary="the order is finished, suggest payment options")
async def process(order_id: int, ctx: Context = Depends(get_context)):
    # return status - how it can be payed, e.g. with vouchers.
    return await ctx.tx_service.transaction_payment_info(order_id)
