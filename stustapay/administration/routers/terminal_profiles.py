from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_terminal_service
from stustapay.core.schema.terminal import TerminalProfile, NewTerminalProfile
from stustapay.core.service.terminal import TerminalService

router = APIRouter(
    prefix="/terminal-profiles",
    tags=["terminal-profiles"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TerminalProfile])
async def list_terminal_profiles(
    token: str = Depends(get_auth_token), terminal_service: TerminalService = Depends(get_terminal_service)
):
    return await terminal_service.profile.list_profiles(token=token)


@router.post("/", response_model=NewTerminalProfile)
async def create_terminal_profile(
    profile: NewTerminalProfile,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    return await terminal_service.profile.create_profile(token=token, profile=profile)


@router.get("/{profile_id}", response_model=TerminalProfile)
async def get_terminal_profile(
    profile_id: int,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.profile.get_profile(token=token, profile_id=profile_id)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.post("/{profile_id}", response_model=TerminalProfile)
async def update_terminal_profile(
    profile_id: int,
    profile: NewTerminalProfile,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    terminal = await terminal_service.profile.update_profile(token=token, profile_id=profile_id, profile=profile)
    if terminal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return terminal


@router.delete("/{profile_id}")
async def delete_terminal_profile(
    profile_id: int,
    token: str = Depends(get_auth_token),
    terminal_service: TerminalService = Depends(get_terminal_service),
):
    deleted = await terminal_service.profile.delete_profile(token=token, profile_id=profile_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
