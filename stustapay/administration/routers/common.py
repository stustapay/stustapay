from fastapi import APIRouter, Depends

from stustapay.core.http.dependencies import get_config

router = APIRouter(
    prefix="",
)


@router.get("/status")
def status(config=Depends(get_config)):
    return config
