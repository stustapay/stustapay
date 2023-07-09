from fastapi import APIRouter, status, HTTPException

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.schema.till import Till, NewTill
from stustapay.core.service.common.decorators import OptionalUserContext

router = APIRouter(
    prefix="/tills",
    tags=["tills"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Till])
async def list_tills(token: CurrentAuthToken, till_service: ContextTillService):
    return await till_service.list_tills(OptionalUserContext(token=token))


@router.post("", response_model=Till)
async def create_till(
    till: NewTill,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.create_till(OptionalUserContext(token=token), till=till)


@router.get("/{till_id}", response_model=Till)
async def get_till(
    till_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    till = await till_service.get_till(OptionalUserContext(token=token), till_id=till_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{till_id}", response_model=Till)
async def update_till(
    till_id: int,
    till: NewTill,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    till = await till_service.update_till(OptionalUserContext(token=token), till_id=till_id, till=till)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{till_id}/logout")
async def logout_till(
    till_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    logged_out = await till_service.logout_terminal_id(OptionalUserContext(token=token), till_id=till_id)
    if not logged_out:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.post("/{till_id}/force-logout-user")
async def force_logout_user(
    till_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    await till_service.force_logout_user(OptionalUserContext(token=token), till_id=till_id)


@router.delete("/{till_id}")
async def delete_till(
    till_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    deleted = await till_service.delete_till(OptionalUserContext(token=token), till_id=till_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
