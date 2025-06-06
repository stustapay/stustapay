from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.till import NewTillProfile, TillProfile

router = APIRouter(
    prefix="/till-profiles",
    tags=["till-profiles"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=NormalizedList[TillProfile, int])
async def list_till_profiles(token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    return normalize_list(await till_service.profile.list_profiles(token=token, node_id=node_id))


@router.post("", response_model=NewTillProfile)
async def create_till_profile(
    profile: NewTillProfile, token: CurrentAuthToken, till_service: ContextTillService, node_id: int
):
    return await till_service.profile.create_profile(token=token, profile=profile, node_id=node_id)


@router.get("/{profile_id}", response_model=TillProfile)
async def get_till_profile(profile_id: int, token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    till = await till_service.profile.get_profile(token=token, profile_id=profile_id, node_id=node_id)
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.post("/{profile_id}", response_model=TillProfile)
async def update_till_profile(
    profile_id: int,
    profile: NewTillProfile,
    token: CurrentAuthToken,
    till_service: ContextTillService,
    node_id: int,
):
    till = await till_service.profile.update_profile(
        token=token, profile_id=profile_id, profile=profile, node_id=node_id
    )
    if till is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return till


@router.delete("/{profile_id}")
async def delete_till_profile(profile_id: int, token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    deleted = await till_service.profile.delete_profile(token=token, till_profile_id=profile_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
