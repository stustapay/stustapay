from dataclasses import dataclass

from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.context import get_terminal_service
from stustapay.core.service.terminal import TerminalService, TerminalRegistrationSuccess

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@dataclass
class TerminalRegistrationPayload:
    registration_uuid: str


@router.post("/register_terminal", response_model=TerminalRegistrationSuccess)
async def register_terminal(
    payload: TerminalRegistrationPayload,
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    result = await terminal_service.register_terminal(registration_uuid=payload.registration_uuid)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return result
