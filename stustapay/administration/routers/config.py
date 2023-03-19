from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextConfigService
from stustapay.core.schema.config import ConfigEntry

router = APIRouter(
    prefix="/config",
    tags=["config"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[ConfigEntry])
async def list_config_entries(token: CurrentAuthToken, config_service: ContextConfigService):
    return await config_service.list_config_entries(token=token)


@router.post("/", response_model=ConfigEntry)
async def set_config_entry(
    config_entry: ConfigEntry,
    token: CurrentAuthToken,
    config_service: ContextConfigService,
):
    return await config_service.set_config_entry(token=token, entry=config_entry)
