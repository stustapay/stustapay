from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_till import get_auth_token
from stustapay.core.http.context import get_till_service
from stustapay.core.schema.till import TillLayout, NewTillLayout
from stustapay.core.service.till import TillService

router = APIRouter(
    prefix="/till-layouts",
    tags=["till-layouts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TillLayout])
async def list_till_layouts(
    token: str = Depends(get_auth_token), till_service: TillService = Depends(get_till_service)
):
    return await till_service.layout.list_layouts(token=token)


@router.post("/", response_model=NewTillLayout)
async def create_till_layout(
    layout: NewTillLayout,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    return await till_service.layout.create_layout(token=token, layout=layout)


@router.get("/{layout_id}", response_model=TillLayout)
async def get_till_layout(
    layout_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.layout.get_layout(token=token, layout_id=layout_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{layout_id}", response_model=TillLayout)
async def update_till_layout(
    layout_id: int,
    layout: NewTillLayout,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.layout.update_layout(token=token, layout_id=layout_id, layout=layout)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.delete("/{layout_id}")
async def delete_till_layout(
    layout_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    deleted = await till_service.layout.delete_layout(token=token, layout_id=layout_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
