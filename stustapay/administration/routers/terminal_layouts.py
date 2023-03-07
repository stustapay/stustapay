from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_terminal import get_auth_token
from stustapay.core.http.context import get_terminal_service
from stustapay.core.schema.terminal import TerminalLayout, NewTerminalLayout
from stustapay.core.service.terminal import TerminalService

router = APIRouter(
    prefix="/terminal-layouts",
    tags=["terminal-layouts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TerminalLayout])
async def list_terminal_layouts(
    token: str = Depends(get_auth_token), terminal_service: TerminalService = Depends(get_terminal_service)
):
    return await terminal_service.layout.list_layouts(token=token)


@router.post("/", response_model=NewTerminalLayout)
async def create_terminal_layout(
    layout: NewTerminalLayout,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    return await terminal_service.layout.create_layout(token=token, layout=layout)


@router.get("/{layout_id}", response_model=TerminalLayout)
async def get_terminal_layout(
    layout_id: int,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.layout.get_layout(token=token, layout_id=layout_id)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.post("/{layout_id}", response_model=TerminalLayout)
async def update_terminal_layout(
    layout_id: int,
    layout: NewTerminalLayout,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.layout.update_layout(token=token, layout_id=layout_id, layout=layout)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.delete("/{layout_id}")
async def delete_terminal_layout(
    layout_id: int,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    deleted = await terminal_service.layout.delete_layout(token=token, layout_id=layout_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
