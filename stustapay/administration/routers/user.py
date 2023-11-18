from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.user import NewUser, NewUserRole, Privilege, User, UserRole

router = APIRouter(
    prefix="",
    responses={404: {"description": "Not found"}},
)

user_router = APIRouter(prefix="/users", tags=["users"])
user_role_router = APIRouter(prefix="/user-roles", tags=["user-roles"])


@user_router.get("", response_model=NormalizedList[User, int])
async def list_users(token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None):
    return normalize_list(await user_service.list_users(token=token, node_id=node_id))


class UpdateUserPayload(BaseModel):
    login: str
    display_name: str
    role_names: list[str]
    description: Optional[str] = None
    user_tag_uid_hex: Optional[str] = None

    @field_validator("user_tag_uid_hex")
    def user_tag_uid_hex_must_be_hexadecimal(cls, v):  # pylint: disable=no-self-argument
        if v is None:
            return v
        int(v, 16)
        return v


class CreateUserPayload(UpdateUserPayload):
    password: Optional[str] = None


@user_router.post("", response_model=User)
async def create_user(
    new_user: CreateUserPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
    node_id: Optional[int] = None,
):
    return await user_service.create_user(
        token=token,
        new_user=NewUser(
            login=new_user.login,
            display_name=new_user.display_name,
            role_names=new_user.role_names,
            description=new_user.description,
            user_tag_uid=int(new_user.user_tag_uid_hex, 16) if new_user.user_tag_uid_hex is not None else None,
        ),
        password=new_user.password,
        node_id=node_id,
    )


@user_router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int, token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None
):
    user = await user_service.get_user(token=token, user_id=user_id, node_id=node_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return user


@user_router.post("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user: UpdateUserPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
    node_id: Optional[int] = None,
):
    updated_user = await user_service.update_user(
        token=token,
        user_id=user_id,
        user=NewUser(
            login=user.login,
            display_name=user.display_name,
            role_names=user.role_names,
            description=user.description,
            user_tag_uid=int(user.user_tag_uid_hex, 16) if user.user_tag_uid_hex is not None else None,
        ),
        node_id=node_id,
    )
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return updated_user


class ChangeUserPasswordPayload(BaseModel):
    new_password: str


@user_router.post("/{user_id}/change-password", response_model=User)
async def change_user_password(
    user_id: int,
    payload: ChangeUserPasswordPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
    node_id: Optional[int] = None,
):
    return await user_service.change_user_password(
        token=token,
        user_id=user_id,
        node_id=node_id,
        new_password=payload.new_password,
    )


@user_router.delete("/{user_id}")
async def delete_user(
    user_id: int, token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None
):
    deleted = await user_service.delete_user(token=token, user_id=user_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@user_role_router.get("", response_model=NormalizedList[UserRole, int])
async def list_user_roles(token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None):
    return normalize_list(await user_service.list_user_roles(token=token, node_id=node_id))


@user_role_router.post("", response_model=UserRole)
async def create_user_role(
    new_user_role: NewUserRole, token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None
):
    return await user_service.create_user_role(token=token, new_role=new_user_role, node_id=node_id)


class UpdateUserRolePrivilegesPayload(BaseModel):
    is_privileged: bool
    privileges: list[Privilege]


@user_role_router.post("/{user_role_id}", response_model=UserRole)
async def update_user_role(
    user_role_id: int,
    updated_role: UpdateUserRolePrivilegesPayload,
    token: CurrentAuthToken,
    user_service: ContextUserService,
    node_id: Optional[int] = None,
):
    role = await user_service.update_user_role_privileges(
        token=token,
        role_id=user_role_id,
        is_privileged=updated_role.is_privileged,
        privileges=updated_role.privileges,
        node_id=node_id,
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return role


@user_role_router.delete("/{user_role_id}")
async def delete_user_role(
    user_role_id: int, token: CurrentAuthToken, user_service: ContextUserService, node_id: Optional[int] = None
):
    deleted = await user_service.delete_user_role(token=token, role_id=user_role_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


router.include_router(user_router)
router.include_router(user_role_router)
