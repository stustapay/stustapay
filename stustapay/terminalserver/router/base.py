"""
some basic api endpoints.
"""
from fastapi import APIRouter, status, Depends, HTTPException

from stustapay.core.http.auth_till import get_auth_token
from stustapay.core.http.context import get_till_service
from stustapay.core.schema.terminal import TerminalConfig
from stustapay.core.service.till import TillService

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
async def config(token: str = Depends(get_auth_token), till_service: TillService = Depends(get_till_service)):
    terminal_config = await till_service.get_terminal_config(token=token)
    if terminal_config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return terminal_config
