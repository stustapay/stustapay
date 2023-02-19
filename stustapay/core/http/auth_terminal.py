from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from stustapay.core.http.context import get_terminal_service
from stustapay.core.schema.terminal import Terminal
from stustapay.core.service.terminal import TerminalService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_terminal(
    token: str = Depends(oauth2_scheme),
    terminal_service: TerminalService = Depends(get_terminal_service),
) -> Terminal:
    terminal = await terminal_service.get_terminal_from_token(token=token)
    if terminal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return terminal


async def get_auth_token(token: str = Depends(oauth2_scheme)) -> str:
    return token
