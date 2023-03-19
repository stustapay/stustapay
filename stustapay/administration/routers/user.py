from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserService
from stustapay.core.schema.user import User, UserWithoutId

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[User])
async def list_users(token: CurrentAuthToken, user_service: ContextUserService):
    return await user_service.list_users(token=token)


class CreateUserPayload(UserWithoutId):
    password: Optional[str]


@router.post("/", response_model=User)
async def create_user(
    new_user: CreateUserPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    return await user_service.create_user(token=token, new_user=new_user, password=new_user.password)


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int, token: CurrentAuthToken, user_service: ContextUserService):
    user = await user_service.get_user(token=token, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@router.post("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user: UserWithoutId,
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    user = await user_service.update_user(token=token, user_id=user_id, user=user)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@router.delete("/{user_id}")
async def delete_user(user_id: int, token: CurrentAuthToken, user_service: ContextUserService):
    deleted = await user_service.delete_user(token=token, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
