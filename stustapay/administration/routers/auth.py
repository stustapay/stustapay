from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserService
from stustapay.core.schema.user import CurrentUser

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


class LoginResponse(BaseModel):
    user: CurrentUser
    access_token: str
    grant_type = "bearer"


@router.post("/login", summary="login with username and password", response_model=LoginResponse)
async def login(
    payload: Annotated[OAuth2PasswordRequestForm, Depends()],
    user_service: ContextUserService,
):
    response = await user_service.login_user(username=payload.username, password=payload.password)
    return {"user": response.user, "access_token": response.token, "grant_type": "bearer"}


@router.post(
    "/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    await user_service.logout_user(token=token)
