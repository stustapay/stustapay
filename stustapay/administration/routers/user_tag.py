from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextUserTagService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.account import UserTagDetail
from stustapay.core.schema.user_tag import NewUserTag, NewUserTagSecret, UserTagSecret

router = APIRouter(
    prefix="",
    tags=["user_tags"],
    responses={404: {"description": "Not found"}},
)


@router.post("/user-tag-secrets", response_model=UserTagSecret)
async def create_user_tag_secret(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    new_secret: NewUserTagSecret,
    node_id: int,
):
    return await user_tag_service.create_user_tag_secret(token=token, node_id=node_id, new_secret=new_secret)


@router.get("/user-tag-secrets", response_model=list[UserTagSecret])
async def list_user_tag_secrets(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    node_id: int,
):
    return await user_tag_service.list_user_tag_secrets(token=token, node_id=node_id)


@router.post("/user-tags")
async def create_user_tags(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    new_user_tags: list[NewUserTag],
    node_id: int,
):
    return await user_tag_service.create_user_tags(token=token, node_id=node_id, new_user_tags=new_user_tags)


class FindUserTagPayload(BaseModel):
    search_term: str


@router.post("/user-tags/find-user-tags", response_model=NormalizedList[UserTagDetail, int])
async def find_user_tags(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    payload: FindUserTagPayload,
    node_id: int,
):
    return normalize_list(
        await user_tag_service.find_user_tags(token=token, search_term=payload.search_term, node_id=node_id),
        primary_key="id",
    )


@router.get("/user-tags/{user_tag_id}", response_model=UserTagDetail)
async def get_user_tag_detail(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    user_tag_id: int,
    node_id: int,
):
    resp = await user_tag_service.get_user_tag_detail(token=token, user_tag_id=user_tag_id, node_id=node_id)
    if resp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return resp


class UpdateCommentPayload(BaseModel):
    comment: str


@router.post("/user-tags/{user_tag_id}/update-comment", response_model=UserTagDetail)
async def update_user_tag_comment(
    token: CurrentAuthToken,
    user_tag_service: ContextUserTagService,
    user_tag_id: int,
    payload: UpdateCommentPayload,
    node_id: int,
):
    return await user_tag_service.update_user_tag_comment(
        token=token, user_tag_id=user_tag_id, comment=payload.comment, node_id=node_id
    )
