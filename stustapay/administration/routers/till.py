from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_till_service
from stustapay.core.schema.till import Till, NewTill
from stustapay.core.service.till import TillService

router = APIRouter(
    prefix="/tills",
    tags=["tills"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Till])
async def list_tills(token: str = Depends(get_auth_token), till_service: TillService = Depends(get_till_service)):
    return await till_service.list_tills(token=token)


@router.post("/", response_model=Till)
async def create_till(
    till: NewTill,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    return await till_service.create_till(token=token, till=till)


@router.get("/{till_id}", response_model=Till)
async def get_till(
    till_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.get_till(token=token, till_id=till_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{till_id}", response_model=Till)
async def update_till(
    till_id: int,
    till: NewTill,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.update_till(token=token, till_id=till_id, till=till)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{till_id}/logout")
async def logout_till(
    till_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    logged_out = await till_service.logout_terminal(token=token, till_id=till_id)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.delete("/{till_id}")
async def delete_till(
    till_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    deleted = await till_service.delete_till(token=token, till_id=till_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
