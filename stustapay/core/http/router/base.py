"""
some basic api endpoints.
"""

from fastapi import APIRouter, status, Depends

from ..context import get_db_conn


router = APIRouter(
    prefix="",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


@router.get("/dbversion", summary="return the database engine version")
async def dbver(conn=Depends(get_db_conn)):
    ver = await conn.fetchval("select version();")
    return {"db_version": ver}
