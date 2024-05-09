from fastapi import APIRouter

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextOrderService
from stustapay.core.service.order.stats import RevenueStats, TimeseriesStatsQuery

router = APIRouter(prefix="/mgmt", tags=["mgmt"])


@router.post("revenue-stats", summary="Get revenue statistics for the current node", response_model=RevenueStats)
async def get_revenue_stats(
    token: CurrentAuthToken,
    order_service: ContextOrderService,
    query: TimeseriesStatsQuery,
):
    return await order_service.stats.get_revenue_stats(token=token, query=query)
