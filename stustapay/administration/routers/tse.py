from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTseService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.tse import Tse, NewTse, UpdateTse

router = APIRouter(
    prefix="/tses",
    tags=["tses"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=NormalizedList[Tse, int])
async def list_tses(token: CurrentAuthToken, tse_service: ContextTseService):
    return normalize_list(await tse_service.list_tses(token=token))


@router.post("/", response_model=Tse)
async def create_tse(token: CurrentAuthToken, tse_service: ContextTseService, new_tse: NewTse):
    return await tse_service.create_tse(token=token, new_tse=new_tse)


@router.post("/{tse_id}", response_model=Tse)
async def update_tse(token: CurrentAuthToken, tse_service: ContextTseService, tse_id: int, updated_tse: UpdateTse):
    return await tse_service.update_tse(token=token, tse_id=tse_id, updated_tse=updated_tse)
