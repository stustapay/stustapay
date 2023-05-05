"""
some basic api endpoints.
"""
from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.schema.terminal import TerminalConfig
from stustapay.core.schema.till import CashRegisterStocking
from stustapay.core.util import BaseModel

router = APIRouter(
    prefix="",
    tags=["base"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


@router.get("/health", summary="health check endpoint")
async def health():
    return {"status": "healthy"}


@router.get("/config", summary="obtain the current terminal config", response_model=TerminalConfig)
async def config(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    terminal_config = await till_service.get_terminal_config(token=token)
    if terminal_config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return terminal_config


@router.get(
    "/cash-register-stockings",
    summary="obtain the list of available cash register stockings",
    response_model=list[CashRegisterStocking],
)
async def list_cash_register_stockings(
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.register.list_cash_register_stockings_terminal(token=token)


class RegisterStockUpPayload(BaseModel):
    cashier_tag_uid: int
    register_stocking_id: int


@router.post(
    "/stock-up-cash-register",
    summary="stock up a cash register",
)
async def stock_up_cash_register(
    token: CurrentAuthToken,
    payload: RegisterStockUpPayload,
    till_service: ContextTillService,
):
    return await till_service.register.stock_up_cash_register(
        token=token, stocking_id=payload.register_stocking_id, cashier_tag_uid=payload.cashier_tag_uid
    )
