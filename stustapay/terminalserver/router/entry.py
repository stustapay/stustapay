from fastapi import APIRouter

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextEntryService
from stustapay.core.schema.entry import EntryScanPayload, EntryScanResult

router = APIRouter(prefix="/entry", tags=["entry"])


@router.post("/scan", summary="Scan a tag for entry or exit", response_model=EntryScanResult)
async def scan_entry(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    payload: EntryScanPayload,
):
    return await entry_service.scan_entry(token=token, tag_uid=payload.tag_uid)
