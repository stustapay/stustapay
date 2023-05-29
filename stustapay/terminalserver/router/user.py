from typing import Optional

from fastapi import APIRouter, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService, ContextUserService, ContextAccountService
from stustapay.core.schema.account import Account
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.user import NewUser, User, UserTag, CurrentUser, CheckLoginResult, LoginPayload
from stustapay.core.util import BaseModel

router = APIRouter(prefix="/user", tags=["user"])


@router.get("", summary="Get the currently logged in User", response_model=Optional[CurrentUser])
async def get_current_user(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.get_current_user(token=token)


@router.post(
    "/check-login",
    summary="Check if a user can login to the terminal and return his roles",
    response_model=CheckLoginResult,
)
async def check_login_user(
    user_tag: UserTag,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    roles = CheckLoginResult(
        roles=await till_service.check_user_login(token=token, user_tag=user_tag),
        user_tag=user_tag,
    )
    return roles


@router.post("/login", summary="Login User", response_model=CurrentUser)
async def login_user(
    payload: LoginPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.login_user(token=token, user_tag=payload.user_tag, user_role_id=payload.user_role_id)


@router.post("/logout", summary="Logout the current user", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    await till_service.logout_user(token=token)


@router.post("/create-user", summary="Create a new user with the given roles", response_model=User)
async def create_user(
    token: CurrentAuthToken,
    user_service: ContextUserService,
    new_user: NewUser,
):
    return await user_service.create_user_terminal(token=token, new_user=new_user)


class UpdateUserPayload(BaseModel):
    user_tag_uid: int
    role_names: list[str]


@router.post("/update-user-roles", summary="Update roles of a given user", response_model=User)
async def create_finanzorga(token: CurrentAuthToken, user_service: ContextUserService, payload: UpdateUserPayload):
    return await user_service.update_user_roles_terminal(
        token=token, user_tag_uid=payload.user_tag_uid, role_names=payload.role_names
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
