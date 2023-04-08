from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, HTTPException

from stustapay.core.http.auth_user import CurrentAuthToken, CurrentAuthTokenFromCookie
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import Order

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={404: {"description": "Not found"}},
)


@router.get("/by-till/{till_id}", response_model=list[Order])
async def list_orders_by_till(token: CurrentAuthToken, till_id: int, order_service: ContextOrderService):
    return await order_service.list_orders_by_till(token=token, till_id=till_id)


@router.get("/", response_model=list[Order])
async def list_orders(token: CurrentAuthToken, order_service: ContextOrderService):
    return await order_service.list_orders(token=token)


@router.get("/{order_id}", response_model=Order)
async def get_order(token: CurrentAuthToken, order_id: int, order_service: ContextOrderService):
    order = await order_service.get_order(token=token, order_id=order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return order


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: CurrentAuthTokenFromCookie):
    order_service = websocket.state.context.order_service
    await websocket.accept()
    subscription = await order_service.register_for_order_updates(token=token)
    try:
        while True:
            order: Order = await subscription.queue.get()
            await websocket.send_text(order.json())
    except WebSocketDisconnect:
        subscription.unsubscribe()
