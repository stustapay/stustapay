from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserService
from stustapay.core.schema.user import User, UserWithoutId, UserRole, NewUserRole, Privilege
from stustapay.core.util import BaseModel

router = APIRouter(
    prefix="",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

user_router = APIRouter(prefix="/users")
user_role_router = APIRouter(prefix="/user_roles")


@user_router.get("/", response_model=list[User])
async def list_users(token: CurrentAuthToken, user_service: ContextUserService):
    return await user_service.list_users(token=token)


class CreateUserPayload(UserWithoutId):
    password: Optional[str]


@user_router.post("/", response_model=User)
async def create_user(
    new_user: CreateUserPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    return await user_service.create_user(token=token, new_user=new_user, password=new_user.password)


@user_router.get("/{user_id}", response_model=User)
async def get_user(user_id: int, token: CurrentAuthToken, user_service: ContextUserService):
    user = await user_service.get_user(token=token, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@user_router.post("/{user_id}", response_model=User)
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


@user_router.delete("/{user_id}")
async def delete_user(user_id: int, token: CurrentAuthToken, user_service: ContextUserService):
    deleted = await user_service.delete_user(token=token, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@user_role_router.get("/", response_model=list[UserRole])
async def list_user_roles(token: CurrentAuthToken, user_service: ContextUserService):
    return await user_service.list_user_roles(token=token)


@user_role_router.post("/", response_model=UserRole)
async def create_user_role(
    new_user_role: NewUserRole,
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    return await user_service.create_user_role(token=token, new_role=new_user_role)


class UpdateUserRolePrivilegesPayload(BaseModel):
    privileges: list[Privilege]


@user_role_router.post("/{user_role_id}", response_model=UserRole)
async def update_user_role(
    user_role_id: int,
    updated_role: UpdateUserRolePrivilegesPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
):
    role = await user_service.update_user_role_privileges(
        token=token, role_id=user_role_id, privileges=updated_role.privileges
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return role


@user_role_router.delete("/{user_role_id}")
async def delete_user_role(user_role_id: int, token: CurrentAuthToken, user_service: ContextUserService):
    deleted = await user_service.delete_user_role(token=token, role_id=user_role_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


router.include_router(user_router)
router.include_router(user_role_router)
