from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserTagService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.account import UserTagDetail

router = APIRouter(
    prefix="",
    tags=["user_tags"],
    responses={404: {"description": "Not found"}},
)


class FindUserTagPayload(BaseModel):
    search_term: str


@router.post("/user-tags/find-user-tags", response_model=NormalizedList[UserTagDetail, int])
async def find_user_tags(token: CurrentAuthToken, user_tag_service: ContextUserTagService, payload: FindUserTagPayload):
    return normalize_list(
        await user_tag_service.find_user_tags(token=token, search_term=payload.search_term), primary_key="user_tag_uid"
    )


@router.get("/user-tags/{user_tag_uid_hex}", response_model=UserTagDetail)
async def get_user_tag_detail(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    user_tag_uid_hex: str,
):
    resp = await user_tag_service.get_user_tag_detail(token=token, user_tag_uid=int(user_tag_uid_hex, 16))
    if resp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return resp


class UpdateCommentPayload(BaseModel):
    comment: str


@router.post("/user-tags/{user_tag_uid_hex}/update-comment", response_model=UserTagDetail)
async def update_user_tag_comment(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    user_tag_uid_hex: str,
    payload: UpdateCommentPayload,
):
    return await user_tag_service.update_user_tag_comment(
        token=token, user_tag_uid=int(user_tag_uid_hex, 16), comment=payload.comment
    )
