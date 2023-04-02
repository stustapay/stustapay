from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService, ContextUserService
from stustapay.core.schema.user import NewUser, User

router = APIRouter(prefix="/user", tags=["user"])


@router.get("", summary="Get the currently logged in User", response_model=Optional[User])
async def get_current_user(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.get_current_user(token=token)


@router.post("/login", summary="Login User", response_model=User)
async def login_user(
    user_tag_uid: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.login_user(token=token, user_tag_uid=user_tag_uid)


@router.post("/logout", summary="Logout the current user", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    logged_out = await till_service.logout_user(token=token)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)


@router.post("/create_cashier", summary="Create a New Account with cashier privilege", response_model=User)
async def create_cashier(
    token: CurrentAuthToken,
    user_service: ContextUserService,
    new_user: NewUser,
):
    return await user_service.create_cashier(token=token, new_user=new_user)


@router.post("/create_finanzorga", summary="Create a New Account with finanzorga privilege", response_model=User)
async def create_finanzorga(
    token: CurrentAuthToken,
    user_service: ContextUserService,
    new_user: NewUser,
):
    return await user_service.create_finanzorga(token=token, new_user=new_user)
