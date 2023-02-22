"""
websocket for live updates
"""

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from stustapay.core.http.context import get_db_conn

router = APIRouter(
    prefix="",
)


class LiveRequest(BaseModel):
    id: str


@router.websocket("/live")
async def terminalsocket(websocket: WebSocket, conn=Depends(get_db_conn)):
    await websocket.accept()
    del conn  # unused db conn

    try:
        data = await websocket.receive_text()
        req = LiveRequest.parse_obj(data)
        print(f"subscription for: {req.id}")

        await websocket.send_text(req.json())

        await websocket.close(code=1000, reason=None)

    except WebSocketDisconnect:
        print("lost connection of ws client")
