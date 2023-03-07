from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_user_service
from stustapay.core.schema.user import User, UserWithoutId
from stustapay.core.service.user import UserService

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[User])
async def list_users(token: str = Depends(get_auth_token), user_service: UserService = Depends(get_user_service)):
    return await user_service.list_users(token=token)


@router.post("/", response_model=User)
async def create_user(
    user: User, token: str = Depends(get_auth_token), user_service: UserService = Depends(get_user_service)
):
    return await user_service.create_user(token=token, user=user)


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int, token: str = Depends(get_auth_token), user_service: UserService = Depends(get_user_service)
):
    user = await user_service.get_user(token=token, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@router.post("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user: UserWithoutId,
    token: str = Depends(get_auth_token),
    user_service: UserService = Depends(get_user_service),
):
    user = await user_service.update_user(token=token, user_id=user_id, user=user)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int, token: str = Depends(get_auth_token), user_service: UserService = Depends(get_user_service)
):
    deleted = await user_service.delete_user(token=token, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
