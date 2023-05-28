from typing import Annotated, Optional

from fastapi import Depends, Cookie
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_auth_token(token: str = Depends(oauth2_scheme)) -> str:
    return token


CurrentAuthToken = Annotated[str, Depends(oauth2_scheme)]


async def get_auth_token_from_cookie(authorization: Optional[str] = Cookie(default=None)) -> Optional[str]:
    return authorization


CurrentAuthTokenFromCookie = Annotated[Optional[str], Depends(get_auth_token_from_cookie)]
