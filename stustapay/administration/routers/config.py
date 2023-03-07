from fastapi import APIRouter, Depends

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_config_service
from stustapay.core.schema.config import ConfigEntry
from stustapay.core.service.config import ConfigService

router = APIRouter(
    prefix="/config",
    tags=["config"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[ConfigEntry])
async def list_config_entries(
    token: str = Depends(get_auth_token), config_service: ConfigService = Depends(get_config_service)
):
    return await config_service.list_config_entries(token=token)


@router.post("/", response_model=ConfigEntry)
async def set_config_entry(
    config_entry: ConfigEntry,
    token: str = Depends(get_auth_token),
    config_service: ConfigService = Depends(get_config_service),
):
    return await config_service.set_config_entry(token=token, entry=config_entry)
