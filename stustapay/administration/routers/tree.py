from fastapi import APIRouter, Response
from pydantic import BaseModel

from stustapay.bon.bon import BonJson
from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTreeService, ContextWebhookService
from stustapay.core.schema.audit_logs import AuditLog
from stustapay.core.schema.media import EventDesign, NewBlob
from stustapay.core.schema.tree import (
    NewEvent,
    NewNode,
    Node,
    NodeSeenByUser,
    RestrictedEventSettings,
    UpdateEvent,
)
from stustapay.core.service.webhook import WebhookType
from stustapay.ticket_shop.pretix import PretixApi, PretixProduct

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


@router.post("/events/{node_id}/event-design/bon-logo")
async def update_bon_logo(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: NewBlob):
    await tree_service.update_bon_logo(token=token, node_id=node_id, image=payload)


@router.get("/events/{node_id}/event-design")
async def get_event_design(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int) -> EventDesign:
    return await tree_service.get_event_design(token=token, node_id=node_id)


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


class PretixFetchProductsPayload(BaseModel):
    organizer: str
    event: str
    apiKey: str
    url: str


@router.post("/events/{node_id}/fetch-pretix-products", response_model=list[PretixProduct])
async def fetch_pretix_products(token: CurrentAuthToken, payload: PretixFetchProductsPayload, node_id: int):
    del token, node_id  # unused
    api = PretixApi(api_key=payload.apiKey, organizer=payload.organizer, event=payload.event, base_url=payload.url)
    return await api.fetch_products()


class GenerateWebhookPayload(BaseModel):
    webhook_type: WebhookType


class GenerateWebhookResponse(BaseModel):
    webhook_url: str


@router.post("/events/{node_id}/generate-webhook-url", response_model=GenerateWebhookResponse)
async def generate_webhook_url(
    token: CurrentAuthToken, webhook_service: ContextWebhookService, node_id: int, payload: GenerateWebhookPayload
):
    url = await webhook_service.get_webhook_url(token=token, node_id=node_id, webhook_type=payload.webhook_type)
    return GenerateWebhookResponse(webhook_url=url)


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
    content = await tree_service.generate_test_report(token=token, node_id=node_id)
    headers = {"Content-Disposition": 'inline; filename="test_report.pdf"'}
    return Response(content, headers=headers, media_type="application/pdf")


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
    content = await tree_service.generate_revenue_report(token=token, node_id=node_id)
    headers = {"Content-Disposition": 'inline; filename="revenue_report.pdf"'}
    return Response(content, headers=headers, media_type="application/pdf")


class SumUpTokenPayload(BaseModel):
    authorization_code: str


@router.post("/nodes/{node_id}/configure-sumup-token")
async def configure_sumup_token(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: SumUpTokenPayload
):
    return await tree_service.sumup_auth_code_flow(
        token=token, node_id=node_id, authorization_code=payload.authorization_code
    )


@router.get("/nodes/{node_id}/audit-logs", response_model=list[AuditLog])
async def list_audit_logs(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    return await tree_service.list_audit_logs(token=token, node_id=node_id)
