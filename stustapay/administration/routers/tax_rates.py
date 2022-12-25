from fastapi import APIRouter

router = APIRouter(
    prefix="/tax-rates",
    tags=["tax-rates"],
    responses={404: {"description": "Not found"}},
)
