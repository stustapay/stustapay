from fastapi import APIRouter, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserService
from stustapay.core.service.user import UserLoginResult

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


class LoginPayload(BaseModel):
    username: str
    password: str
    node_id: int | None = None


@router.post("/login", summary="login with username and password", response_model=UserLoginResult)
async def login(
    payload: LoginPayload,
    user_service: ContextUserService,
):
    return await user_service.login_user(username=payload.username, password=payload.password, node_id=payload.node_id)


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password", summary="change password")
async def change_password(
    token: CurrentAuthToken,
    payload: ChangePasswordPayload,
    user_service: ContextUserService,
):
    await user_service.change_password(
        token=token, old_password=payload.old_password, new_password=payload.new_password
    )


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
