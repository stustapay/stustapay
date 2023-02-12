from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth import get_current_user
from stustapay.core.http.context import get_terminal_service
from stustapay.core.schema.terminal import Terminal, NewTerminal
from stustapay.core.schema.user import User
from stustapay.core.service.terminal import TerminalService

router = APIRouter(
    prefix="/terminals",
    tags=["terminals"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Terminal])
async def list_tax_rates(
    user: User = Depends(get_current_user), terminal_service: TerminalService = Depends(get_terminal_service)
):
    return await terminal_service.list_terminals(user=user)


@router.post("/", response_model=Terminal)
async def create_terminal(
    terminal: NewTerminal,
    user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    return await terminal_service.create_terminal(user=user, terminal=terminal)


@router.get("/{terminal_id}", response_model=Terminal)
async def get_tax_rate(
    terminal_id: int,
    user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.get_terminal(user=user, terminal_id=terminal_id)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.post("/{terminal_id}", response_model=Terminal)
async def update_terminal(
    terminal_id: int,
    terminal: NewTerminal,
    user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.update_terminal(user=user, terminal_id=terminal_id, terminal=terminal)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.delete("/{terminal_id}")
async def delete_terminal(
    terminal_id: int,
    user: User = Depends(get_current_user),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    deleted = await terminal_service.delete_terminal(user=user, terminal_id=terminal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
