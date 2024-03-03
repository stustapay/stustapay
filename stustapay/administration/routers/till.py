from typing import Optional

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.till import NewTill, Till

router = APIRouter(
    prefix="/tills",
    tags=["tills"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=NormalizedList[Till, int])
async def list_tills(token: CurrentAuthToken, till_service: ContextTillService, node_id: Optional[int] = None):
    return normalize_list(await till_service.list_tills(token=token, node_id=node_id))


@router.post("", response_model=Till)
async def create_till(
    till: NewTill, token: CurrentAuthToken, till_service: ContextTillService, node_id: Optional[int] = None
):
    return await till_service.create_till(token=token, till=till, node_id=node_id)


@router.get("/{till_id}", response_model=Till)
async def get_till(
    till_id: int, token: CurrentAuthToken, till_service: ContextTillService, node_id: Optional[int] = None
):
    till = await till_service.get_till(token=token, till_id=till_id, node_id=node_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{till_id}", response_model=Till)
async def update_till(
    till_id: int,
    till: NewTill,
    token: CurrentAuthToken,
    till_service: ContextTillService,
    node_id: Optional[int] = None,
):
    updated_till = await till_service.update_till(token=token, till_id=till_id, till=till, node_id=node_id)
    if updated_till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return updated_till


@router.post("/{till_id}/force-logout-user")
async def force_logout_user(
    till_id: int, token: CurrentAuthToken, till_service: ContextTillService, node_id: Optional[int] = None
):
    await till_service.force_logout_user(token=token, till_id=till_id, node_id=node_id)


@router.delete("/{till_id}")
async def delete_till(
    till_id: int, token: CurrentAuthToken, till_service: ContextTillService, node_id: Optional[int] = None
):
    deleted = await till_service.delete_till(token=token, till_id=till_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
