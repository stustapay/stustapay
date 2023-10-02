from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTreeService
from stustapay.core.schema.tree import Node, UpdateEvent

router = APIRouter(
    prefix="/tree",
    tags=["tree"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=Node)
async def get_tree_for_current_user(token: CurrentAuthToken, tree_service: ContextTreeService):
    return await tree_service.get_tree_for_current_user(token=token)


@router.post("/events/{node_id}", response_model=Node)
async def update_event(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: UpdateEvent):
    return await tree_service.update_event(token=token, node_id=node_id, event=payload)
