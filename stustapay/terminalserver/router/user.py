from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService, ContextUserService, ContextAccountService
from stustapay.core.schema.customer import Customer
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


@router.post("/grant-free-ticket", summary="grant a free ticket, e.g. to a volunteer", response_model=Customer)
async def grant_free_ticket(
    grant: NewFreeTicketGrant,
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    till_service: ContextTillService,
):
    success = await account_service.grant_free_tickets(token=token, new_free_ticket_grant=grant)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
    return till_service.get_customer(token=token, customer_uid=grant.user_tag_uid)


class GrantVoucherPayload(BaseModel):
    vouchers: int
    user_tag_uid: int


@router.post("/grant-vouchers", summary="grant vouchers to a customer", response_model=Customer)
async def grant_vouchers(
    grant: GrantVoucherPayload,
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    till_service: ContextTillService,
):
    success = await account_service.grant_vouchers(
        token=token, user_tag_uid=grant.user_tag_uid, vouchers=grant.vouchers
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
    return till_service.get_customer(token=token, customer_uid=grant.user_tag_uid)
