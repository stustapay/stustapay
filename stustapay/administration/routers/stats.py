from datetime import datetime
from typing import Optional

from fastapi import APIRouter

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.service.order.stats import (
    ProductStats,
    TimeseriesStats,
    TimeseriesStatsQuery,
    VoucherStats,
)

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    responses={404: {"description": "Not found"}},
)


@router.get("/products", response_model=ProductStats)
async def get_product_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    to_timestamp: Optional[datetime] = None,
    from_timestamp: Optional[datetime] = None,
):
    return await order_service.stats.get_product_stats(
        token=token,
        query=TimeseriesStatsQuery(to_time=to_timestamp, from_time=from_timestamp),
        node_id=node_id,
    )


@router.get("/vouchers", response_model=VoucherStats)
async def get_voucher_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    to_timestamp: Optional[datetime] = None,
    from_timestamp: Optional[datetime] = None,
):
    return await order_service.stats.get_voucher_stats(
        token=token, query=TimeseriesStatsQuery(to_time=to_timestamp, from_time=from_timestamp), node_id=node_id
    )


@router.get("/entries", response_model=TimeseriesStats)
async def get_entry_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    to_timestamp: Optional[datetime] = None,
    from_timestamp: Optional[datetime] = None,
):
    return await order_service.stats.get_entry_stats(
        token=token,
        query=TimeseriesStatsQuery(to_time=to_timestamp, from_time=from_timestamp),
        node_id=node_id,
    )


@router.get("/top-ups", response_model=TimeseriesStats)
async def get_top_up_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    node_id: int,
    to_timestamp: Optional[datetime] = None,
    from_timestamp: Optional[datetime] = None,
):
    return await order_service.stats.get_top_up_stats(
        token=token,
        query=TimeseriesStatsQuery(to_time=to_timestamp, from_time=from_timestamp),
        node_id=node_id,
    )
