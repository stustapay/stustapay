from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.auth import get_current_user
from stustapay.core.http.context import get_user_service
from stustapay.core.schema.user import User
from stustapay.core.service.users import UserService, UserLoginSuccess

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return response


@router.post(
    "/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    await user_service.logout_user(user=user)
