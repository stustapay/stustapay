from typing import Annotated

from fastapi import APIRouter, Depends

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import Context, ContextConfigService, get_context
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.config import ConfigEntry, PublicConfig

router = APIRouter(
    prefix="",
    tags=["config"],
    responses={404: {"description": "Not found"}},
)


class Config(PublicConfig):
    terminal_api_endpoint: str


@router.get("/public-config", response_model=Config)
async def get_public_config(context: Annotated[Context, Depends(get_context)], config_service: ContextConfigService):
    config: PublicConfig = await config_service.get_public_config()
    return Config(
        test_mode=context.config.core.test_mode,
        test_mode_message=context.config.core.test_mode_message,
        sumup_topup_enabled_globally=config.sumup_topup_enabled_globally,
        terminal_api_endpoint=context.config.terminalserver.base_url,
    )


@router.get("/config", response_model=NormalizedList[ConfigEntry, str])
async def list_config_entries(token: CurrentAuthToken, config_service: ContextConfigService):
    return normalize_list(await config_service.list_config_entries(token=token), primary_key="key")


@router.post("/config", response_model=ConfigEntry)
async def set_config_entry(
    config_entry: ConfigEntry,
    token: CurrentAuthToken,
    config_service: ContextConfigService,
):
    return await config_service.set_config_entry(token=token, entry=config_entry)
