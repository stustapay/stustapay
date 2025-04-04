from uuid import UUID

from fastapi import APIRouter, Response

from stustapay.core.http.context import ContextMediaService

router = APIRouter(
    prefix="/media",
    tags=["media"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/blob/{blob_id}",
    response_class=Response,
)
async def get_blob(media_service: ContextMediaService, blob_id: UUID):
    blob = await media_service.get_blob(blob_id=blob_id)

    return Response(content=blob.data, media_type=blob.mime_type)
