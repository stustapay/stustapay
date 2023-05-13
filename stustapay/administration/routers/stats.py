from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.service.order.stats import ProductStats

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    responses={404: {"description": "Not found"}},
)


@router.get("/products", response_model=ProductStats)
async def get_product_stats(token: CurrentAuthToken, order_service: ContextOrderService):
    return await order_service.stats.get_product_stats(token=token)
