import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from stustapay.administration.service import (
    HeadwindClient,
    HeadwindDevice,
    HeadwindError,
    get_headwind_client,
)
from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import Context, ContextTerminalService, get_context
from stustapay.core.schema.terminal import HeadwindDeviceMappingWithTerminal

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/mdm",
    tags=["mdm"],
    responses={404: {"description": "Not found"}},
)


def get_headwind_client_dep(context: Context = Depends(get_context)) -> HeadwindClient:
    return get_headwind_client(context.config)


class HeadwindDeviceWithMapping(BaseModel):
    device: HeadwindDevice
    mapping: Optional[HeadwindDeviceMappingWithTerminal] = None


class CreateHeadwindMappingPayload(BaseModel):
    terminal_id: int
    headwind_device_id: str
    headwind_device_number: str | None = None
    headwind_device_name: str | None = None
    headwind_device_serial: str | None = None
    headwind_device_model: str | None = None


def _require_headwind_enabled(client: HeadwindClient):
    if not client.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Headwind integration is disabled in the configuration",
        )
    return client


def _normalize_device_id(value: int | str) -> str:
    return str(value)


@router.get("/mappings", response_model=list[HeadwindDeviceMappingWithTerminal])
async def list_mappings(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    return await terminal_service.list_headwind_mappings(token=token, node_id=node_id)


@router.get("/devices", response_model=list[HeadwindDeviceWithMapping])
async def list_headwind_devices(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
    headwind_client: HeadwindClient = Depends(get_headwind_client_dep),
    page: int = Query(0, ge=0),
    page_size: int = Query(100, ge=1, le=500),
    search: str | None = None,
):
    client = _require_headwind_enabled(headwind_client)

    try:
        devices = await client.list_devices(page=page, page_size=page_size, search=search)
    except HeadwindError as e:
        logger.error(f"Headwind API error: {e.msg}, status: {e.status}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Headwind MDM error: {e.msg}",
        ) from e
    
    mappings = await terminal_service.list_headwind_mappings(token=token, node_id=node_id)
    mapping_by_device_id = {_normalize_device_id(m.headwind_device_id): m for m in mappings}

    device_with_mapping: list[HeadwindDeviceWithMapping] = []
    for device in devices:
        mapped = mapping_by_device_id.get(_normalize_device_id(device.id))
        device_with_mapping.append(HeadwindDeviceWithMapping(device=device, mapping=mapped))
    return device_with_mapping


@router.post("/mappings", response_model=HeadwindDeviceMappingWithTerminal, status_code=status.HTTP_201_CREATED)
async def create_or_update_mapping(
    payload: CreateHeadwindMappingPayload,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
    headwind_client: HeadwindClient = Depends(get_headwind_client_dep),
    context: Context = Depends(get_context),
):
    client = _require_headwind_enabled(headwind_client)

    mapping = await terminal_service.upsert_headwind_mapping(
        token=token,
        node_id=node_id,
        terminal_id=payload.terminal_id,
        headwind_device_id=payload.headwind_device_id,
        headwind_device_number=payload.headwind_device_number,
        headwind_device_name=payload.headwind_device_name,
        headwind_device_serial=payload.headwind_device_serial,
        headwind_device_model=payload.headwind_device_model,
    )

    token_value, terminal = await terminal_service.issue_headwind_terminal_token(
        token=token, node_id=node_id, terminal_id=payload.terminal_id
    )

    # Use Headwind custom device attributes (CUSTOM1, CUSTOM2, CUSTOM3)
    # These can be used as %CUSTOM1%, %CUSTOM2%, %CUSTOM3% in the app's application settings in Headwind UI
    push_error: str | None = None
    try:
        await client.update_device_custom_attributes(
            device_id=mapping.headwind_device_id,
            device_number=mapping.headwind_device_number,
            custom1=token_value,  # MDM_TERMINAL_TOKEN
            custom2=context.config.terminalserver.base_url,  # TERMINAL_BASE_URL
            custom3=terminal.name,  # TERMINAL_NAME (optional)
        )
    except HeadwindError as exc:
        logger.warning(
            "Failed to push Headwind token to device %s for terminal %s: %s",
            mapping.headwind_device_id,
            terminal.id,
            exc,
        )
        push_error = str(exc)
    finally:
        push_result = await terminal_service.record_headwind_push_result(
            token=token,
            node_id=node_id,
            mapping_id=mapping.id,
            success=push_error is None,
            error_message=push_error,
        )
        mapping = mapping.model_copy(
            update={
                "last_token_pushed_at": push_result.last_token_pushed_at,
                "last_push_status": push_result.last_push_status,
                "last_push_error": push_result.last_push_error,
            }
        )

    return mapping


@router.delete("/mappings/{terminal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    terminal_id: int,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    deleted = await terminal_service.delete_headwind_mapping(token=token, node_id=node_id, terminal_id=terminal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found")


@router.post(
    "/mappings/{terminal_id}/refresh-token",
    response_model=HeadwindDeviceMappingWithTerminal,
)
async def refresh_mapping_token(
    terminal_id: int,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
    headwind_client: HeadwindClient = Depends(get_headwind_client_dep),
    context: Context = Depends(get_context),
):
    client = _require_headwind_enabled(headwind_client)

    mapping = await terminal_service.get_headwind_mapping_with_terminal(
        token=token, node_id=node_id, terminal_id=terminal_id
    )
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No mapping for terminal")

    token_value, terminal = await terminal_service.issue_headwind_terminal_token(
        token=token, node_id=node_id, terminal_id=terminal_id
    )

    # Use Headwind custom device attributes (CUSTOM1, CUSTOM2, CUSTOM3)
    push_error: str | None = None
    try:
        await client.update_device_custom_attributes(
            device_id=mapping.headwind_device_id,
            device_number=mapping.headwind_device_number,
            custom1=token_value,  # MDM_TERMINAL_TOKEN
            custom2=context.config.terminalserver.base_url,  # TERMINAL_BASE_URL
            custom3=terminal.name,  # TERMINAL_NAME (optional)
        )
    except HeadwindError as exc:
        logger.warning(
            "Failed to refresh Headwind token for terminal %s: %s",
            terminal_id,
            exc,
        )
        push_error = str(exc)

    push_result = await terminal_service.record_headwind_push_result(
        token=token,
        node_id=node_id,
        mapping_id=mapping.id,
        success=push_error is None,
        error_message=push_error,
    )

    return mapping.model_copy(
        update={
            "last_token_pushed_at": push_result.last_token_pushed_at,
            "last_push_status": push_result.last_push_status,
            "last_push_error": push_result.last_push_error,
        }
    )

