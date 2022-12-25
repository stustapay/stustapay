from fastapi import APIRouter

router = APIRouter(
    prefix="/cashiers",
    tags=["cashiers"],
    responses={404: {"description": "Not found"}},
)
