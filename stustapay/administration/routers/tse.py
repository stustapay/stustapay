from fastapi import APIRouter, HTTPException, Response, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTseService
from stustapay.core.schema.tse import NewTse, Tse, UpdateTse

router = APIRouter(
    prefix="/tses",
    tags=["tses"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Tse])
async def list_tses(token: CurrentAuthToken, response: Response, tse_service: ContextTseService, node_id: int):
    resp = await tse_service.list_tses(token=token, node_id=node_id)
    response.headers["Content-Range"] = str(len(resp))
    return resp


@router.post("", response_model=Tse)
async def create_tse(token: CurrentAuthToken, tse_service: ContextTseService, new_tse: NewTse, node_id: int):
    return await tse_service.create_tse(token=token, new_tse=new_tse, node_id=node_id)


@router.get("/{tse_id}", response_model=Tse)
async def get_tse(tse_id: int, token: CurrentAuthToken, tse_service: ContextTseService, node_id: int):
    return await tse_service.get_tse(token=token, tse_id=tse_id, node_id=node_id)


@router.put("/{tse_id}", response_model=Tse)
async def update_tse(
    token: CurrentAuthToken,
    tse_service: ContextTseService,
    tse_id: int,
    updated_tse: UpdateTse,
    node_id: int,
):
    return await tse_service.update_tse(token=token, tse_id=tse_id, updated_tse=updated_tse, node_id=node_id)
