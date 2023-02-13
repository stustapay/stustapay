"""
some basic api endpoints.
"""

from fastapi import APIRouter, status


router = APIRouter(
    prefix="/api",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


@router.get("/health", summary="health check endpoint")
async def health():
    return {"status": "healthy"}
