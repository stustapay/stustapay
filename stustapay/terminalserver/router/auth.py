from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.context import get_till_service
from stustapay.core.schema.terminal import TerminalRegistrationSuccess
from stustapay.core.service.till.till import TillService


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
    till_service: TillService = Depends(get_till_service),
):
    result = await till_service.register_terminal(registration_uuid=payload.registration_uuid)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return result
