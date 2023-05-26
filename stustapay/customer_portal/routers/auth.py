from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.schema.customer import Customer

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


class LoginResponse(BaseModel):
    customer: Customer
    access_token: str
    grant_type = "bearer"


@router.post("/login", summary="customer login with wristband hardware tag and pin", response_model=LoginResponse)
async def login(
    payload: Annotated[OAuth2PasswordRequestForm, Depends()],
    customer_service: ContextCustomerService,
):
    # Names are due to OAuth compatibility
    try:
        user_tag_uid = int(payload.username, 16)
    except Exception as e:  # pylint: disable=broad-except
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED) from e

    response = await customer_service.login_customer(uid=user_tag_uid, pin=payload.password)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return {"customer": response.customer, "access_token": response.token, "grant_type": "bearer"}


@router.post(
    "/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    logged_out = await customer_service.logout_customer(token=token)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
