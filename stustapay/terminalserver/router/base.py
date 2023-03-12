"""
some basic api endpoints.
"""

from fastapi import APIRouter, Depends, status

from stustapay.core.http.context import get_terminal_service
from stustapay.core.service.terminal import TerminalService

router = APIRouter(
    prefix="",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


@router.get("/health", summary="health check endpoint")
async def health():
    return {"status": "healthy"}


@router.get("/config", summary="obtain the current terminal config")
async def config(
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    return terminal_service.get_terminal_config()
