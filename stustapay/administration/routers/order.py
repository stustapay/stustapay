from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.bon.bon import BonJson
from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.order import CompletedSaleProducts, EditSaleProducts, Order

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={404: {"description": "Not found"}},
)


@router.get("/by-till/{till_id}", response_model=NormalizedList[Order, int])
async def list_orders_by_till(token: CurrentAuthToken, till_id: int, order_service: ContextOrderService, node_id: int):
    return normalize_list(await order_service.list_orders_by_till(token=token, till_id=till_id, node_id=node_id))


@router.get("", response_model=NormalizedList[Order, int])
async def list_orders(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    customer_account_id: Optional[int] = None,
):
    return normalize_list(
        await order_service.list_orders(token=token, customer_account_id=customer_account_id, node_id=node_id)
    )


@router.get("/{order_id}", response_model=Order)
async def get_order(token: CurrentAuthToken, order_id: int, order_service: ContextOrderService, node_id: int):
    order = await order_service.get_order(token=token, order_id=order_id, node_id=node_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return order


@router.get("/{order_id}/bon", response_model=BonJson)
async def get_order_bon(order_id: int, order_service: ContextOrderService):
    return await order_service.get_bon_by_id(order_id=order_id)


@router.delete("/{order_id}")
async def cancel_order(token: CurrentAuthToken, order_id: int, order_service: ContextOrderService, node_id: int):
    await order_service.cancel_sale_admin(token=token, order_id=order_id, node_id=node_id)


@router.post("/{order_id}/edit", response_model=CompletedSaleProducts)
async def edit_order(
    token: CurrentAuthToken,
    order_id: int,
    order_service: ContextOrderService,
    edit_sale: EditSaleProducts,
    node_id: int,
):
    return await order_service.edit_sale_products(token=token, order_id=order_id, edit_sale=edit_sale, node_id=node_id)
