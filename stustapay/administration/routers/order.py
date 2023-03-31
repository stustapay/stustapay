from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from stustapay.core.http.auth_user import CurrentAuthToken, CurrentAuthTokenFromCookie
from stustapay.core.http.context import ContextOrderService
from stustapay.core.schema.order import Order

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Order])
async def list_accounts(token: CurrentAuthToken, order_service: ContextOrderService):
    return await order_service.list_orders(token=token)


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
