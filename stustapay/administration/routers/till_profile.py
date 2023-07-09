from fastapi import APIRouter, status, HTTPException

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.schema.till import TillProfile, NewTillProfile
from stustapay.core.service.common.decorators import OptionalUserContext

router = APIRouter(
    prefix="/till-profiles",
    tags=["till-profiles"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[TillProfile])
async def list_till_profiles(token: CurrentAuthToken, till_service: ContextTillService):
    return await till_service.profile.list_profiles(OptionalUserContext(token=token))


@router.post("", response_model=NewTillProfile)
async def create_till_profile(
    profile: NewTillProfile,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.profile.create_profile(OptionalUserContext(token=token), profile=profile)


@router.get("/{profile_id}", response_model=TillProfile)
async def get_till_profile(
    profile_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    till = await till_service.profile.get_profile(OptionalUserContext(token=token), profile_id=profile_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{profile_id}", response_model=TillProfile)
async def update_till_profile(
    profile_id: int,
    profile: NewTillProfile,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    till = await till_service.profile.update_profile(
        OptionalUserContext(token=token), profile_id=profile_id, profile=profile
    )
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.delete("/{profile_id}")
async def delete_till_profile(
    profile_id: int,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    deleted = await till_service.profile.delete_profile(OptionalUserContext(token=token), profile_id=profile_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
