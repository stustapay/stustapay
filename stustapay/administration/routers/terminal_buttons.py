from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_user import get_current_user
from stustapay.core.http.context import get_terminal_service
from stustapay.core.schema.terminal import TerminalButton, NewTerminalButton
from stustapay.core.schema.user import User
from stustapay.core.service.terminal import TerminalService

router = APIRouter(
    prefix="/terminal-buttons",
    tags=["terminal-buttons"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TerminalButton])
async def list_terminal_buttons(
    current_user: User = Depends(get_current_user), terminal_service: TerminalService = Depends(get_terminal_service)
):
    return await terminal_service.layout.list_buttons(current_user=current_user)


@router.post("/", response_model=NewTerminalButton)
async def create_terminal_button(
    button: NewTerminalButton,
    current_user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    return await terminal_service.layout.create_button(current_user=current_user, button=button)


@router.get("/{button_id}", response_model=TerminalButton)
async def get_terminal_button(
    button_id: int,
    current_user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.layout.get_button(current_user=current_user, button_id=button_id)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.post("/{button_id}", response_model=TerminalButton)
async def update_terminal_button(
    button_id: int,
    button: NewTerminalButton,
    current_user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.layout.update_button(
        current_user=current_user, button_id=button_id, button=button
    )
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.delete("/{button_id}")
async def delete_terminal_button(
    button_id: int,
    current_user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    deleted = await terminal_service.layout.delete_button(current_user=current_user, button_id=button_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
