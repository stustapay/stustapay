from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from stustapay.core.service.users import UserService
from stustapay.core.schema.user import User
from stustapay.core.http.context import get_user_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_service: UserService = Depends(get_user_service),
) -> User:
    user = await user_service.get_user_from_token(token=token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
