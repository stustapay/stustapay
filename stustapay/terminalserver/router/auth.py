from dataclasses import dataclass

from fastapi import APIRouter, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTerminalService
from stustapay.core.schema.terminal import TerminalRegistrationSuccess

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@dataclass
class TerminalRegistrationPayload:
    registration_uuid: str


@router.post("/register_terminal", summary="Register a new Terminal", response_model=TerminalRegistrationSuccess)
async def register_terminal(
    payload: TerminalRegistrationPayload,
    terminal_service: ContextTerminalService,
):
    return await terminal_service.register_terminal(registration_uuid=payload.registration_uuid)


@router.post("/logout_terminal", summary="Log out this Terminal", status_code=status.HTTP_204_NO_CONTENT)
async def logout_terminal(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    await terminal_service.logout_terminal(token=token)
