from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService
from stustapay.core.schema.account import Account, UserTagDetail

router = APIRouter(
    prefix="",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/system-accounts", response_model=list[Account])
async def list_system_accounts(token: CurrentAuthToken, account_service: ContextAccountService):
    return await account_service.list_system_accounts(token=token)


class FindAccountPayload(BaseModel):
    search_term: str


@router.post("/accounts/find-accounts", response_model=list[Account])
async def find_accounts(token: CurrentAuthToken, account_service: ContextAccountService, payload: FindAccountPayload):
    return await account_service.find_accounts(token=token, search_term=payload.search_term)


@router.get("/accounts/{account_id}", response_model=Account)
async def get_account(token: CurrentAuthToken, account_service: ContextAccountService, account_id: int):
    account = await account_service.get_account(token=token, account_id=account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return account


@router.post("/accounts/{account_id}/disable")
async def disable_account(token: CurrentAuthToken, account_service: ContextAccountService, account_id: int):
    success = await account_service.disable_account(token=token, account_id=account_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)


class UpdateBalancePayload(BaseModel):
    new_balance: float


@router.post("/accounts/{account_id}/update-balance")
async def update_balance(
    token: CurrentAuthToken, account_service: ContextAccountService, account_id: int, payload: UpdateBalancePayload
):
    await account_service.update_account_balance(token=token, account_id=account_id, new_balance=payload.new_balance)


class UpdateVoucherAmountPayload(BaseModel):
    new_voucher_amount: int


@router.post("/accounts/{account_id}/update-voucher-amount")
async def update_voucher_amount(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    account_id: int,
    payload: UpdateVoucherAmountPayload,
):
    await account_service.update_account_vouchers(
        token=token, account_id=account_id, new_voucher_amount=payload.new_voucher_amount
    )


class UpdateTagUidPayload(BaseModel):
    new_tag_uid_hex: str
    comment: Optional[str] = None


@router.post("/accounts/{account_id}/update-tag-uid")
async def update_tag_uid(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    account_id: int,
    payload: UpdateTagUidPayload,
):
    success = await account_service.switch_account_tag_uid_admin(
        token=token, account_id=account_id, new_user_tag_uid=int(payload.new_tag_uid_hex, 16), comment=payload.comment
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)


class UpdateAccountCommentPayload(BaseModel):
    comment: str


@router.post("/accounts/{account_id}/update-comment", response_model=Account)
async def update_account_comment(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    account_id: int,
    payload: UpdateAccountCommentPayload,
):
    return await account_service.update_account_comment(token=token, account_id=account_id, comment=payload.comment)


@router.get("/user-tags/{user_tag_uid_hex}", response_model=UserTagDetail)
async def get_user_tag_detail(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    user_tag_uid_hex: str,
):
    resp = await account_service.get_user_tag_detail(token=token, user_tag_uid=int(user_tag_uid_hex, 16))
    if resp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return resp


class UpdateCommentPayload(BaseModel):
    comment: str


@router.post("/user-tags/{user_tag_uid_hex}/update-comment", response_model=UserTagDetail)
async def update_user_tag_comment(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    user_tag_uid_hex: str,
    payload: UpdateCommentPayload,
):
    return await account_service.update_user_tag_comment(
        token=token, user_tag_uid=int(user_tag_uid_hex, 16), comment=payload.comment
    )
