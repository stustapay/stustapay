from typing import Optional

from fastapi import APIRouter, status
from pydantic import BaseModel

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import (
    ContextAccountService,
    ContextTerminalService,
    ContextUserService,
)
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.user import (
    CheckLoginResult,
    CurrentUser,
    LoginPayload,
    NewUser,
    User,
    UserTag,
)

router = APIRouter(prefix="/user", tags=["user"])


@router.get("", summary="Get the currently logged in User", response_model=Optional[CurrentUser])
async def get_current_user(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    return await terminal_service.get_current_user(token=token)


@router.post(
    "/check-login",
    summary="Check if a user can login to the terminal and return his roles",
    response_model=CheckLoginResult,
)
async def check_login_user(
    user_tag: UserTag,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    roles = CheckLoginResult(
        roles=await terminal_service.check_user_login(token=token, user_tag=user_tag),
        user_tag=user_tag,
    )
    return roles


@router.post("/login", summary="Login User", response_model=CurrentUser)
async def login_user(
    payload: LoginPayload,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    return await terminal_service.login_user(token=token, user_tag=payload.user_tag, user_role_id=payload.user_role_id)


@router.post("/logout", summary="Logout the current user", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    await terminal_service.logout_user(token=token)


class CreateUserPayload(NewUser):
    role_ids: list[int]


@router.post("/create-user", summary="Create a new user with the given roles", response_model=User)
async def create_user(
    token: CurrentAuthToken,
    user_service: ContextUserService,
    new_user: CreateUserPayload,
):
    return await user_service.create_user_terminal(token=token, new_user=new_user, role_ids=new_user.role_ids)


class UpdateUserPayload(BaseModel):
    user_tag_uid: int
    role_ids: list[int]


@router.post("/update-user-roles", summary="Update the roles of a given user", response_model=User)
async def update_user_roles(
    token: CurrentAuthToken,
    user_service: ContextUserService,
    payload: UpdateUserPayload,
):
    return await user_service.update_user_roles_terminal(
        token=token, user_tag_uid=payload.user_tag_uid, role_ids=payload.role_ids
    )


@router.post("/grant-free-ticket", summary="grant a free ticket, e.g. to a volunteer", response_model=Account)
async def grant_free_ticket(
    grant: NewFreeTicketGrant,
    token: CurrentAuthToken,
    account_service: ContextAccountService,
):
    return await account_service.grant_free_tickets(token=token, new_free_ticket_grant=grant)


class GrantVoucherPayload(BaseModel):
    vouchers: int
    user_tag_uid: int


@router.post("/grant-vouchers", summary="grant vouchers to a customer", response_model=Account)
async def grant_vouchers(
    grant: GrantVoucherPayload,
    token: CurrentAuthToken,
    account_service: ContextAccountService,
):
    return await account_service.grant_vouchers(token=token, user_tag_uid=grant.user_tag_uid, vouchers=grant.vouchers)
