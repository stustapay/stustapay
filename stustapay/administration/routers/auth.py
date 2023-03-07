from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_user_service
from stustapay.core.service.user import UserService, UserLoginSuccess

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@dataclass
class LoginPayload:
    username: str
    password: str


@router.post("/login", summary="login with username and password", response_model=UserLoginSuccess)
async def login(
    payload: LoginPayload,
    user_service: UserService = Depends(get_user_service),
):
    response = await user_service.login_user(username=payload.username, password=payload.password)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return response


@router.post(
    "/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    token: str = Depends(get_auth_token),
    user_service: UserService = Depends(get_user_service),
):
    logged_out = await user_service.logout_user(token=token)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
