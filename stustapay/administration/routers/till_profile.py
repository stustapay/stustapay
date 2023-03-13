from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_till_service
from stustapay.core.schema.till import TillProfile, NewTillProfile
from stustapay.core.service.till import TillService

router = APIRouter(
    prefix="/till-profiles",
    tags=["till-profiles"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TillProfile])
async def list_till_profiles(
    token: str = Depends(get_auth_token), till_service: TillService = Depends(get_till_service)
):
    return await till_service.profile.list_profiles(token=token)


@router.post("/", response_model=NewTillProfile)
async def create_till_profile(
    profile: NewTillProfile,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    return await till_service.profile.create_profile(token=token, profile=profile)


@router.get("/{profile_id}", response_model=TillProfile)
async def get_till_profile(
    profile_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.profile.get_profile(token=token, profile_id=profile_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{profile_id}", response_model=TillProfile)
async def update_till_profile(
    profile_id: int,
    profile: NewTillProfile,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    till = await till_service.profile.update_profile(token=token, profile_id=profile_id, profile=profile)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.delete("/{profile_id}")
async def delete_till_profile(
    profile_id: int,
    token: str = Depends(get_auth_token),
    till_service: TillService = Depends(get_till_service),
):
    deleted = await till_service.profile.delete_profile(token=token, profile_id=profile_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
