from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTerminalService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.terminal import MdmDeviceLocation, MdmDeviceWithMapping, NewTerminal, Terminal

router = APIRouter(
    prefix="/terminal",
    tags=["terminals"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=NormalizedList[Terminal, int])
async def list_terminals(token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int):
    return normalize_list(await terminal_service.list_terminals(token=token, node_id=node_id))


@router.post("", response_model=Terminal)
async def create_terminal(
    terminal: NewTerminal,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    return await terminal_service.create_terminal(token=token, terminal=terminal, node_id=node_id)


@router.get("/mdm-devices", response_model=list[MdmDeviceWithMapping])
async def list_mdm_devices(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    return await terminal_service.list_mdm_devices_with_mappings(token=token, node_id=node_id)


class ChangeMdmDeviceMappingPayload(BaseModel):
    mdm_device_id: str
    terminal_id: int


@router.post("/mdm-devices/change-device-to-terminal-mapping")
async def change_mdm_device_mapping(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
    payload: ChangeMdmDeviceMappingPayload,
):
    return await terminal_service.change_mdm_device_to_terminal_mapping(
        token=token,
        node_id=node_id,
        mdm_device_id=payload.mdm_device_id,
        terminal_id=payload.terminal_id,
    )


@router.get("/mdm-devices/{mdm_device_id}/location", response_model=MdmDeviceLocation)
async def get_mdm_device_location(
    mdm_device_id: str,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    return await terminal_service.get_mdm_device_location(
        token=token,
        node_id=node_id,
        mdm_device_id=mdm_device_id,
    )


@router.get("/{terminal_id}", response_model=Terminal)
async def get_terminal(
    terminal_id: int, token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int
):
    terminal = await terminal_service.get_terminal(token=token, terminal_id=terminal_id, node_id=node_id)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.post("/{terminal_id}", response_model=Terminal)
async def update_terminal(
    terminal_id: int,
    terminal: NewTerminal,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
):
    return await terminal_service.update_terminal(
        token=token, terminal_id=terminal_id, terminal=terminal, node_id=node_id
    )


@router.delete("/{terminal_id}")
async def delete_terminal(
    terminal_id: int, token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int
):
    deleted = await terminal_service.delete_terminal(token=token, terminal_id=terminal_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.post("/{terminal_id}/logout")
async def logout_terminal(
    terminal_id: int, token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int
):
    logged_out = await terminal_service.logout_terminal_id(token=token, terminal_id=terminal_id, node_id=node_id)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


class SwitchTillPayload(BaseModel):
    new_till_id: int


@router.post("/{terminal_id}/switch-till", tags=["tills", "terminals"])
async def switch_till(
    terminal_id: int,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
    node_id: int,
    payload: SwitchTillPayload,
):
    await terminal_service.switch_till(
        token=token, terminal_id=terminal_id, node_id=node_id, new_till_id=payload.new_till_id
    )


@router.post("/{terminal_id}/force-logout-user")
async def force_logout_user(
    terminal_id: int, token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int
):
    await terminal_service.force_logout_user(token=token, terminal_id=terminal_id, node_id=node_id)
