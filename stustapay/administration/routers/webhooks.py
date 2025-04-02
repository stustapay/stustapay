from fastapi import APIRouter, Request

from stustapay.core.http.context import ContextWebhookService

router = APIRouter(
    prefix="/webhooks",
    tags=["webhooks"],
    responses={404: {"description": "Not found"}},
)


@router.post("/hook")
async def trigger_webhook(webhook_service: ContextWebhookService, token: str, request: Request):
    return await webhook_service.trigger_webhook(token=token, payload=await request.json())
