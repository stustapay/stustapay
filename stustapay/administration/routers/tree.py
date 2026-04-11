import logging

from fastapi import APIRouter, Response, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

from stustapay.administration.service import HeadwindError, build_headwind_custom3, get_headwind_client
from stustapay.bon.bon import BonJson
from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import Context, ContextTreeService, get_context
from stustapay.core.schema.tree import (
    CopyEventRequest,
    NewEvent,
    NewNode,
    Node,
    NodeSeenByUser,
    RestrictedEventSettings,
    UpdateEvent,
)

logger = logging.getLogger(__name__)

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


@router.post("/events/{node_id}/copy-event")
async def copy_event(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, payload: CopyEventRequest
) -> Node:
    return await tree_service.copy_event(token=token, node_id=node_id, request=payload)


@router.post("/events/{node_id}/event-settings")
async def update_event(
    token: CurrentAuthToken,
    tree_service: ContextTreeService,
    node_id: int,
    payload: UpdateEvent,
    context: Context = Depends(get_context),
) -> Node:
    previous_settings = await tree_service.get_restricted_event_settings(token=token, node_id=node_id)
    updated_node = await tree_service.update_event(token=token, node_id=node_id, event=payload)

    wifi_changed = (
        previous_settings.wifi_ssid != payload.wifi_ssid
        or previous_settings.wifi_passphrase != payload.wifi_passphrase
    )
    if not wifi_changed or not context.config.headwind.enabled:
        return updated_node

    headwind_client = get_headwind_client(context.config)
    mappings = await context.terminal_service.list_headwind_mappings(token=token, node_id=node_id)

    for mapping in mappings:
        push_error: str | None = None
        try:
            await headwind_client.update_device_custom_attributes(
                device_id=mapping.headwind_device_id,
                custom3=build_headwind_custom3(
                    terminal_name=mapping.terminal_name,
                    wifi_ssid=payload.wifi_ssid,
                    wifi_passphrase=payload.wifi_passphrase,
                ),
            )
        except HeadwindError as exc:
            push_error = str(exc)
            logger.warning(
                "Failed to sync Headwind Wi-Fi settings for mapping %s on device %s: %s",
                mapping.id,
                mapping.headwind_device_id,
                exc,
            )
        await context.terminal_service.record_headwind_wifi_push_result(
            token=token,
            node_id=node_id,
            mapping_id=mapping.id,
            success=push_error is None,
            error_message=push_error,
        )

    return updated_node


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


@router.post("/events/{node_id}/banner")
async def upload_event_banner(
    token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int, file: UploadFile = File(...)
):
    """Upload a banner image for an event."""
    contents = await file.read()
    await tree_service.upload_event_banner(token=token, node_id=node_id, image_data=contents)
    return {"status": "ok"}


@router.delete("/events/{node_id}/banner")
async def delete_event_banner(token: CurrentAuthToken, tree_service: ContextTreeService, node_id: int):
    """Delete the banner image for an event."""
    await tree_service.delete_event_banner(token=token, node_id=node_id)
    return {"status": "ok"}


@router.get("/events/{node_id}/banner")
async def get_event_banner(tree_service: ContextTreeService, node_id: int):
    """Retrieve the banner image for an event."""
    banner_data = await tree_service.get_event_banner(node_id=node_id)
    if banner_data is None:
        raise HTTPException(status_code=404, detail="Banner not found")
    return Response(
        content=banner_data["image"],
        media_type=banner_data["mime_type"],
        headers=banner_data["headers"],
    )
