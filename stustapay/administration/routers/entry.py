from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextEntryService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.entry import (
    EntryArea,
    EntryAreaGroup,
    EntryAreaGroupAssignPayload,
    EntryAreaGroupWindow,
    EntryAreaGroupWithGroup,
    EntryGroup,
    EntryGroupMember,
    EntryGroupMemberAddPayload,
    EntryGroupMemberAddByGroupTagPayload,
    EntryDirection,
    EntryScanLog,
    EntryScanLogQuery,
    NewEntryArea,
    NewEntryAreaGroupWindow,
    NewEntryGroup,
)

router = APIRouter(
    prefix="/entry",
    tags=["entry"],
    responses={status.HTTP_404_NOT_FOUND: {"description": "Not found"}},
)


@router.get("/areas", response_model=NormalizedList[EntryArea, int])
async def list_entry_areas(token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int):
    return normalize_list(await entry_service.list_entry_areas(token=token, node_id=node_id))


@router.post("/areas", response_model=EntryArea)
async def create_entry_area(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area: NewEntryArea
):
    return await entry_service.create_entry_area(token=token, node_id=node_id, area=area)


@router.get("/areas/{area_id}", response_model=EntryArea)
async def get_entry_area(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int
):
    area = await entry_service.get_entry_area(token=token, node_id=node_id, area_id=area_id)
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return area


@router.post("/areas/{area_id}", response_model=EntryArea)
async def update_entry_area(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int, area: NewEntryArea
):
    return await entry_service.update_entry_area(token=token, node_id=node_id, area_id=area_id, area=area)


@router.delete("/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry_area(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int
):
    deleted = await entry_service.delete_entry_area(token=token, node_id=node_id, area_id=area_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/areas/{area_id}/groups", response_model=list[EntryAreaGroupWithGroup])
async def list_entry_area_groups(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int
):
    return await entry_service.list_entry_area_groups(token=token, node_id=node_id, area_id=area_id)


@router.post("/areas/{area_id}/groups", response_model=EntryAreaGroup)
async def assign_entry_group_to_area(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int,
    payload: EntryAreaGroupAssignPayload,
):
    return await entry_service.assign_entry_group_to_area(
        token=token, node_id=node_id, area_id=area_id, payload=payload
    )


@router.delete("/areas/{area_id}/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_entry_group_from_area(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int, group_id: int
):
    deleted = await entry_service.remove_entry_group_from_area(
        token=token, node_id=node_id, area_id=area_id, group_id=group_id
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/areas/{area_id}/groups/{group_id}/windows", response_model=list[EntryAreaGroupWindow])
async def list_entry_area_group_windows(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, area_id: int, group_id: int
):
    return await entry_service.list_entry_area_group_windows(
        token=token, node_id=node_id, area_id=area_id, group_id=group_id
    )


@router.post("/areas/{area_id}/groups/{group_id}/windows", response_model=EntryAreaGroupWindow)
async def create_entry_area_group_window(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int,
    group_id: int,
    window: NewEntryAreaGroupWindow,
):
    return await entry_service.create_entry_area_group_window(
        token=token, node_id=node_id, area_id=area_id, group_id=group_id, window=window
    )


@router.post("/areas/{area_id}/groups/{group_id}/windows/{window_id}", response_model=EntryAreaGroupWindow)
async def update_entry_area_group_window(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int,
    group_id: int,
    window_id: int,
    window: NewEntryAreaGroupWindow,
):
    return await entry_service.update_entry_area_group_window(
        token=token, node_id=node_id, area_id=area_id, group_id=group_id, window_id=window_id, window=window
    )


@router.delete("/areas/{area_id}/groups/{group_id}/windows/{window_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry_area_group_window(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int,
    group_id: int,
    window_id: int,
):
    deleted = await entry_service.delete_entry_area_group_window(
        token=token, node_id=node_id, area_id=area_id, group_id=group_id, window_id=window_id
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/groups", response_model=NormalizedList[EntryGroup, int])
async def list_entry_groups(token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int):
    return normalize_list(await entry_service.list_entry_groups(token=token, node_id=node_id))


@router.post("/groups", response_model=EntryGroup)
async def create_entry_group(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group: NewEntryGroup
):
    return await entry_service.create_entry_group(token=token, node_id=node_id, group=group)


@router.get("/groups/{group_id}", response_model=EntryGroup)
async def get_entry_group(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group_id: int
):
    group = await entry_service.get_entry_group(token=token, node_id=node_id, group_id=group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return group


@router.post("/groups/{group_id}", response_model=EntryGroup)
async def update_entry_group(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group_id: int, group: NewEntryGroup
):
    return await entry_service.update_entry_group(token=token, node_id=node_id, group_id=group_id, group=group)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry_group(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group_id: int
):
    deleted = await entry_service.delete_entry_group(token=token, node_id=node_id, group_id=group_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/groups/{group_id}/members", response_model=list[EntryGroupMember])
async def list_entry_group_members(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group_id: int
):
    return await entry_service.list_entry_group_members(token=token, node_id=node_id, group_id=group_id)


@router.post("/groups/{group_id}/members", response_model=EntryGroupMember)
async def add_entry_group_member(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    group_id: int,
    payload: EntryGroupMemberAddPayload,
):
    return await entry_service.add_entry_group_member(token=token, node_id=node_id, group_id=group_id, payload=payload)


@router.post("/groups/{group_id}/members/by-group-tag", response_model=list[EntryGroupMember])
async def add_entry_group_members_by_group_tag(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    group_id: int,
    payload: EntryGroupMemberAddByGroupTagPayload,
):
    return await entry_service.add_entry_group_members_by_group_tag(
        token=token, node_id=node_id, group_id=group_id, payload=payload
    )


@router.delete("/groups/{group_id}/members/{user_tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_entry_group_member(
    token: CurrentAuthToken, entry_service: ContextEntryService, node_id: int, group_id: int, user_tag_id: int
):
    deleted = await entry_service.remove_entry_group_member(
        token=token, node_id=node_id, group_id=group_id, user_tag_id=user_tag_id
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/logs", response_model=list[EntryScanLog])
async def list_entry_scan_logs(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int | None = None,
    group_id: int | None = None,
    terminal_id: int | None = None,
    direction: EntryDirection | None = None,
    allowed: bool | None = None,
    user_tag_uid: int | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    limit: int = 200,
    offset: int = 0,
):
    query = EntryScanLogQuery(
        area_id=area_id,
        group_id=group_id,
        terminal_id=terminal_id,
        direction=direction,
        allowed=allowed,
        user_tag_uid=user_tag_uid,
        from_time=from_time,
        to_time=to_time,
        limit=limit,
        offset=offset,
    )
    return await entry_service.list_entry_scan_logs(token=token, node_id=node_id, query=query)


@router.get("/logs/export", response_model=str)
async def export_entry_scan_logs(
    token: CurrentAuthToken,
    entry_service: ContextEntryService,
    node_id: int,
    area_id: int | None = None,
    group_id: int | None = None,
    terminal_id: int | None = None,
    direction: EntryDirection | None = None,
    allowed: bool | None = None,
    user_tag_uid: int | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    limit: int = 200,
    offset: int = 0,
):
    query = EntryScanLogQuery(
        area_id=area_id,
        group_id=group_id,
        terminal_id=terminal_id,
        direction=direction,
        allowed=allowed,
        user_tag_uid=user_tag_uid,
        from_time=from_time,
        to_time=to_time,
        limit=limit,
        offset=offset,
    )
    return await entry_service.export_entry_scan_logs(token=token, node_id=node_id, query=query)
