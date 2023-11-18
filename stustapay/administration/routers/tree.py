from fastapi import APIRouter, Response

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTreeService
from stustapay.core.schema.tree import Node, RestrictedEventSettings, UpdateEvent

router = APIRouter(
    prefix="/tree",
    tags=["tree"],
    responses={404: {"description": "Not found"}},
)


@router.get("/")
async def get_tree_for_current_user(token: CurrentAuthToken, tree_service: ContextTreeService) -> Node:
    return await tree_service.get_tree_for_current_user(token=token)


@router.post("/events/{node_id}")
async def update_event(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: UpdateEvent
) -> Node:
    return await tree_service.update_event(token=token, node_id=node_id, event=payload)


@router.get("/events/{node_id}/settings")
async def get_restricted_event_settings(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int
) -> RestrictedEventSettings:
    return await tree_service.get_restricted_event_settings(token=token, node_id=node_id)


@router.post(
    "/events/{node_id}/generate-test-bon",
    responses={
        "200": {
            "description": "Successful Response",
            "content": {"application/pdf": {}},
        }
    },
)
async def generate_test_bon(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    pdf_content = await tree_service.generate_test_bon(token=token, node_id=node_id)
    headers = {"Content-Disposition": 'inline; filename="test_bon.pdf"'}
    return Response(pdf_content, headers=headers, media_type="application/pdf")
