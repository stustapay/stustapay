from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService
from stustapay.core.schema.account import Account

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
