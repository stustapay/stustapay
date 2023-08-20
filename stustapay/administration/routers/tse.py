from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTseService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.tse import Tse

router = APIRouter(
    prefix="/tses",
    tags=["tses"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=NormalizedList[Tse, int])
async def list_tses(token: CurrentAuthToken, tse_service: ContextTseService):
    return normalize_list(await tse_service.list_tses(token=token), primary_key="tse_id")
