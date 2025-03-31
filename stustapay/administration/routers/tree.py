from fastapi import APIRouter, Response
from pydantic import BaseModel

from stustapay.bon.bon import BonJson
from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTreeService
from stustapay.core.schema.tree import (
    NewEvent,
    NewNode,
    Node,
    NodeSeenByUser,
    RestrictedEventSettings,
    UpdateEvent,
)

router = APIRouter(
    prefix="/tree",
    tags=["tree"],
    responses={404: {"description": "Not found"}},
)


@router.get("/")
async def get_tree_for_current_user(token: CurrentAuthToken, tree_service: ContextTreeService) -> NodeSeenByUser:
    return await tree_service.get_tree_for_current_user(token=token)


@router.post("/nodes/{node_id}/create-node")
async def create_node(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: NewNode
) -> Node:
    return await tree_service.create_node(token=token, node_id=node_id, new_node=payload)


@router.post("/nodes/{node_id}/settings")
async def update_node(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: NewNode
) -> Node:
    return await tree_service.update_node(token=token, node_id=node_id, updated_node=payload)


@router.post("/nodes/{node_id}/archive-node")
async def archive_node(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    await tree_service.archive_node(token=token, node_id=node_id)


@router.post("/nodes/{node_id}/create-event")
async def create_event(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: NewEvent
) -> Node:
    return await tree_service.create_event(token=token, node_id=node_id, event=payload)


@router.post("/events/{node_id}/event-settings")
async def update_event(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: UpdateEvent
) -> Node:
    return await tree_service.update_event(token=token, node_id=node_id, event=payload)


@router.get("/events/{node_id}/settings")
async def get_restricted_event_settings(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int
) -> RestrictedEventSettings:
    return await tree_service.get_restricted_event_settings(token=token, node_id=node_id)


@router.delete("/nodes/{node_id}")
async def delete_node(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    return await tree_service.delete_node(token=token, node_id=node_id)


@router.post("/events/{node_id}/generate-test-bon", response_model=BonJson)
async def generate_test_bon(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    return await tree_service.generate_test_bon(token=token, node_id=node_id)


@router.post("/events/{node_id}/check-pretix-connection")
async def check_pretix_connection(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    return await tree_service.check_pretix_connection(token=token, node_id=node_id)


@router.post(
    "/events/{node_id}/generate-test-report",
    responses={
        "200": {
            "description": "Successful Response",
            "content": {"application/pdf": {}},
        }
    },
)
async def generate_test_report(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    mime_type, content = await tree_service.generate_test_report(token=token, node_id=node_id)
    headers = {"Content-Disposition": 'inline; filename="test_report.pdf"'}
    return Response(content, headers=headers, media_type=mime_type)


@router.post(
    "/nodes/{node_id}/generate-revenue-report",
    responses={
        "200": {
            "description": "Successful Response",
            "content": {"application/pdf": {}},
        }
    },
)
async def generate_revenue_report(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    mime_type, content = await tree_service.generate_revenue_report(token=token, node_id=node_id)
    headers = {"Content-Disposition": 'inline; filename="revenue_report.pdf"'}
    return Response(content, headers=headers, media_type=mime_type)


class SumUpTokenPayload(BaseModel):
    authorization_code: str


@router.post("/nodes/{node_id}/configure-sumup-token")
async def configure_sumup_token(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: SumUpTokenPayload
):
    return await tree_service.sumup_auth_code_flow(
        token=token, node_id=node_id, authorization_code=payload.authorization_code
    )
