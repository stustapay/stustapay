from dataclasses import dataclass

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.service.till.till import TillRegistrationSuccess

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@dataclass
class TillRegistrationPayload:
    registration_uuid: str


@router.post("/register_terminal", summary="Register a new Terminal", response_model=TillRegistrationSuccess)
async def register_terminal(
    payload: TillRegistrationPayload,
    till_service: ContextTillService,
):
    result = await till_service.register_terminal(registration_uuid=payload.registration_uuid)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return result


@router.post("/logout_terminal", summary="Log out this Terminal", status_code=status.HTTP_204_NO_CONTENT)
async def logout_terminal(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    logged_out = await till_service.logout_terminal(token=token)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
