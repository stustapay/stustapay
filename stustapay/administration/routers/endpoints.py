from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from stustapay.core.http.context import get_context, Context

router = APIRouter(
    prefix="/api-endpoints",
    tags=["api-endpoints"],
    responses={404: {"description": "Not found"}},
)


class ApiEndpoints(BaseModel):
    terminal_api_endpoint: str


@router.get("/", response_model=ApiEndpoints)
async def get_api_endpoints(context: Annotated[Context, Depends(get_context)]):
    terminal_endpoint = context.config.terminalserver.base_url.replace("http://", "")
    return ApiEndpoints(terminal_api_endpoint=terminal_endpoint)
