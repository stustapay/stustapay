from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService
from stustapay.core.schema.account import Account

router = APIRouter(
    prefix="/accounts",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Account])
async def list_accounts(token: CurrentAuthToken, account_service: ContextAccountService):
    return await account_service.list_accounts(token=token)
