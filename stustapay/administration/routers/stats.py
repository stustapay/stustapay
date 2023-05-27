from datetime import datetime
from typing import Optional

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
async def get_product_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    to_timestamp: Optional[datetime] = None,
    from_timestamp: Optional[datetime] = None,
):
    return await order_service.stats.get_product_stats(
        token=token, to_timestamp=to_timestamp, from_timestamp=from_timestamp
    )
