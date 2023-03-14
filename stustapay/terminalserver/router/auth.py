from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.context import get_till_service
from stustapay.core.service.till.till import TillService, TillRegistrationSuccess


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@dataclass
class TillRegistrationPayload:
    registration_uuid: str


@router.post("/register_terminal", response_model=TillRegistrationSuccess)
async def register_terminal(
    payload: TillRegistrationPayload,
    till_service: TillService = Depends(get_till_service),
):
    result = await till_service.register_terminal(registration_uuid=payload.registration_uuid)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return result
