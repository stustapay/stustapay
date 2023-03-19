from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_auth_token(token: str = Depends(oauth2_scheme)) -> str:
    return token


CurrentAuthToken = Annotated[str, Depends(oauth2_scheme)]
