from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.product import Product
from stustapay.core.schema.tree import Node, PublicEventSettings
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from sftkit.error import InvalidArgument
from stustapay.core.service.product import fetch_pay_out_product, fetch_top_up_product
from stustapay.core.service.tree.common import fetch_event_for_node, fetch_node

REVENUE_PREDICTION_MAX_HISTORY_DAYS = 365


class ProductSoldStats(Product):
    quantity_sold: int


class VoucherStats(BaseModel):
    vouchers_issued: int
    vouchers_spent: int


class OverviewStats(BaseModel):
    n_transactions: int


class StatInterval(BaseModel):
    from_time: datetime
    to_time: datetime
    count: int
    revenue: float


class Timeseries(BaseModel):
    from_time: datetime
    to_time: datetime
    intervals: list[StatInterval]


class TimeseriesStats(BaseModel):
    from_time: datetime
    to_time: datetime
    daily_intervals: list[StatInterval]
    hourly_intervals: list[StatInterval]


class TimeseriesStatsQuery(BaseModel):
    from_time: Optional[datetime]
    to_time: Optional[datetime]
    till_id: Optional[int] = None
    subnode_id: Optional[int] = None


class ProductTimeseries(BaseModel):
    product_id: int
    product_name: str
    intervals: list[StatInterval]


class ProductOverallStats(BaseModel):
    product_id: int
    product_name: str
    count: int
    revenue: float


class ProductStats(BaseModel):
    from_time: datetime
    to_time: datetime
    daily_intervals: list[StatInterval]
    hourly_intervals: list[StatInterval]
    product_hourly_intervals: list[ProductTimeseries]
    product_overall_stats: list[ProductOverallStats]
    deposit_hourly_intervals: list[ProductTimeseries]
    deposit_overall_stats: list[ProductOverallStats]


class RevenueStats(BaseModel):
    from_time: datetime
    to_time: datetime
    daily_intervals: list[StatInterval]
    hourly_intervals: list[StatInterval]


class DashboardOverview(BaseModel):
    total_guest_credit: float
    total_revenue: float
    guests_with_orders: int
    guests_with_credit: int
    guests_paid_out: int
    online_donation: float
    online_for_payout: float


class CounterRevenue(BaseModel):
    till_id: int
    till_name: str
    revenue: float
    order_count: int


class RevenueByCounter(BaseModel):
    counters: list[CounterRevenue]
    total_revenue: float


class PaymentMethodStats(BaseModel):
    payment_method: str
    revenue: float
    order_count: int


class PaymentMethodBreakdown(BaseModel):
    methods: list[PaymentMethodStats]
    total_revenue: float


class HourlyPredictionPoint(BaseModel):
    hour: int  # 0-23
    actual_revenue: Optional[float]  # None for future hours
    predicted_revenue: float
    cumulative_actual: Optional[float]
    cumulative_predicted: float


class RevenuePrediction(BaseModel):
    current_revenue: float
    predicted_end_of_day: float
    predicted_event_total: float
    confidence_level: str  # "low" | "medium" | "high"
    hours_of_data: int
    days_of_data: int
    events_used: int  # Number of historical events used
    data_source: str  # "customer" | "system" - indicates which data source was used
    hourly_timeseries: list[HourlyPredictionPoint]  # For line chart
    average_daily_revenue: float  # Historical average
    # Visitor-based metrics
    expected_visitors_per_day: Optional[int]  # Configured expected visitors (from event settings)
    actual_visitors_today: int  # Count of unique guests with orders today
    historical_revenue_per_visitor: Optional[float]  # Average revenue per visitor from historical data
    visitor_based_prediction: Optional[float]  # Alternative prediction: expected_visitors * historical_revenue_per_visitor


def get_event_time_bounds(query: TimeseriesStatsQuery, event: PublicEventSettings) -> tuple[datetime, datetime]:
    if query.from_time is not None and query.to_time is not None and query.from_time > query.to_time:
        raise InvalidArgument("Stats start time must be before end time")

    # "All dates" requests do not send explicit bounds and should include all available data,
    # not only the configured event start/end window.
    if query.from_time is None and query.to_time is None:
        return (
            datetime(year=1970, month=1, day=1, tzinfo=timezone.utc),
            datetime(year=4000, month=1, day=1, tzinfo=timezone.utc),
        )

    from_t = query.from_time or event.start_date or datetime(year=1970, month=1, day=1, tzinfo=timezone.utc)
    to_t = query.to_time or event.end_date or datetime(year=4000, month=1, day=1, tzinfo=timezone.utc)
    return from_t, to_t


async def _timed_stats_query(
    *,
    query_name: str,
    query_coro,
    node_id: Optional[int] = None,
    till_id: Optional[int] = None,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
):
    del query_name, node_id, till_id, from_time, to_time
    return await query_coro


async def get_hourly_entry_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    stats = await _timed_stats_query(
        query_name="get_hourly_entry_stats",
        node_id=node.id,
        till_id=query.till_id,
        from_time=from_time,
        to_time=to_time,
        query_coro=conn.fetch_many(
            StatInterval,
            "select "
            "   date_trunc('hour', o.booked_at) as from_time, "
            "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
            "   sum(li.quantity) as count,"
            "   round(sum(li.total_price), 2) as revenue "
            "from ordr o "
            "join till t on o.till_id = t.id "
            "join node n on n.id = t.node_id "
            "join line_item li on o.id = li.order_id "
            "join product p on li.product_id = p.id "
            "where ($3 = any(n.parent_ids) or n.id = $3) "
            "   and p.ticket_metadata_id is not null and o.booked_at >= $1 and o.booked_at <= $2 "
            "   and ($4::int IS NULL OR o.till_id = $4) "
            "group by from_time, to_time "
            "order by from_time",
            from_time,
            to_time,
            node.id,
            query.till_id,
        ),
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_top_up_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    top_up_product = await fetch_top_up_product(conn=conn, node=node)

    stats = await _timed_stats_query(
        query_name="get_hourly_top_up_stats",
        node_id=node.id,
        till_id=query.till_id,
        from_time=from_time,
        to_time=to_time,
        query_coro=conn.fetch_many(
            StatInterval,
            "select "
            "   date_trunc('hour', o.booked_at) as from_time, "
            "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
            "   sum(li.quantity) as count,"
            "   round(sum(li.total_price), 2) as revenue "
            "from ordr o "
            "join till t on o.till_id = t.id "
            "join node n on n.id = t.node_id "
            "join line_item li on o.id = li.order_id "
            "join product p on li.product_id = p.id "
            "where ($3 = any(n.parent_ids) or n.id = $3) "
            "   and p.id = $4 and o.booked_at >= $1 and o.booked_at <= $2 "
            "   and ($5::int IS NULL OR o.till_id = $5) "
            "group by from_time, to_time "
            "order by from_time",
            from_time,
            to_time,
            node.id,
            top_up_product.id,
            query.till_id,
        ),
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_pay_out_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    pay_out_product = await fetch_pay_out_product(conn=conn, node=node)

    stats = await _timed_stats_query(
        query_name="get_hourly_pay_out_stats",
        node_id=node.id,
        till_id=query.till_id,
        from_time=from_time,
        to_time=to_time,
        query_coro=conn.fetch_many(
            StatInterval,
            "select "
            "   date_trunc('hour', o.booked_at) as from_time, "
            "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
            "   sum(li.quantity) as count,"
            "   round(sum(li.total_price), 2) as revenue "
            "from ordr o "
            "join till t on o.till_id = t.id "
            "join node n on n.id = t.node_id "
            "join line_item li on o.id = li.order_id "
            "join product p on li.product_id = p.id "
            "where ($3 = any(n.parent_ids) or n.id = $3) "
            "   and p.id = $4 and o.booked_at >= $1 and o.booked_at <= $2 "
            "   and ($5::int IS NULL OR o.till_id = $5) "
            "group by from_time, to_time "
            "order by from_time",
            from_time,
            to_time,
            node.id,
            pay_out_product.id,
            query.till_id,
        ),
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_sales_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    """
    We are interested in general sales revenue excluding all topups, payouts and ticket sales.

    Therefore, we filter the orders for payment type 'tag' which will result in only including actual vending products.
    We currently assume that only payments made with a tag are actual vending payments (since anything else is
    currently not possible in the system).
    """

    stats = await _timed_stats_query(
        query_name="get_hourly_sales_stats",
        node_id=node.id,
        till_id=query.till_id,
        from_time=from_time,
        to_time=to_time,
        query_coro=conn.fetch_many(
            StatInterval,
            "with scope_tills as materialized ("
            "   select t.id "
            "   from till t "
            "   join node n on n.id = t.node_id "
            "   where ($3 = any(n.parent_ids) or n.id = $3)"
            ") "
            "select "
            "   date_trunc('hour', o.booked_at) as from_time, "
            "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
            "   sum(li.quantity) as count,"
            "   round(sum(li.total_price), 2) as revenue "
            "from ordr o "
            "join scope_tills st on st.id = o.till_id "
            "join line_item li on o.id = li.order_id "
            "where o.booked_at >= $1 and o.booked_at <= $2 and o.payment_method = 'tag' "
            "   and o.order_type = 'sale' "
            "   and ($4::int IS NULL OR o.till_id = $4) "
            "group by from_time, to_time "
            "order by from_time",
            from_time,
            to_time,
            node.id,
            query.till_id,
        ),
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_product_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime, returnable=False
) -> list[ProductTimeseries]:
    result = await _timed_stats_query(
        query_name=f"get_hourly_product_stats:returnable={returnable}",
        node_id=node.id,
        till_id=query.till_id,
        from_time=from_time,
        to_time=to_time,
        query_coro=conn.fetch(
            "with scope_tills as materialized ("
            "   select t.id "
            "   from till t "
            "   join node n on n.id = t.node_id "
            "   where ($3 = any(n.parent_ids) or n.id = $3)"
            ") "
            "select "
            "   p.id as product_id, "
            "   p.name as product_name, "
            "   date_trunc('hour', o.booked_at) as from_time, "
            "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
            "   sum(li.quantity) as count, "
            "   round(sum(li.total_price), 2) as revenue "
            "from ordr o "
            "join scope_tills st on st.id = o.till_id "
            "join line_item li on o.id = li.order_id "
            "join product p on li.product_id = p.id "
            "where o.booked_at >= $1 and o.booked_at <= $2 "
            "   and p.type = 'user_defined' "
            "   and p.is_returnable = $4 "
            "   and ($5::int IS NULL OR o.till_id = $5) "
            "group by p.id, p.name, from_time, to_time "
            "order by from_time",
            from_time,
            to_time,
            node.id,
            returnable,
            query.till_id,
        ),
    )
    product_timeseries_map: dict[int, list[StatInterval]] = {}
    product_names: dict[int, str] = {}
    for row in result:
        product_timeseries_map.setdefault(row["product_id"], []).append(
            StatInterval(from_time=row["from_time"], to_time=row["to_time"], count=row["count"], revenue=row["revenue"])
        )
        product_names[row["product_id"]] = row["product_name"]
    return [
        ProductTimeseries(product_id=p_id, intervals=intervals, product_name=product_names[p_id])
        for p_id, intervals in product_timeseries_map.items()
    ]


async def get_daily_stats(*, hourly_stats: Timeseries, event: PublicEventSettings) -> Timeseries:
    if event.daily_end_time is None:
        raise InvalidArgument("daily end time must be set for this event to accurately compute the daily statistics")
    if event.start_date is None or event.end_date is None:
        raise InvalidArgument(
            "event start and end dates must be set for this event to accurately compute the daily statistics"
        )

    next_day = (hourly_stats.from_time + timedelta(days=1)).replace(
        hour=event.daily_end_time.hour,
        minute=event.daily_end_time.minute,
        second=event.daily_end_time.second,
    )
    stats = []
    current_interval = StatInterval(
        from_time=hourly_stats.from_time,
        to_time=next_day,
        count=0,
        revenue=0,
    )
    for hourly_stat in hourly_stats.intervals:
        while hourly_stat.from_time > next_day:
            stats.append(current_interval)
            current_interval = StatInterval(
                from_time=next_day,
                to_time=next_day + timedelta(days=1),
                count=0,
                revenue=0,
            )
            next_day = next_day + timedelta(days=1)
        current_interval.count += hourly_stat.count  # pylint: disable=no-member
        current_interval.revenue += hourly_stat.revenue  # pylint: disable=no-member
    stats.append(current_interval)
    return Timeseries(from_time=hourly_stats.from_time, to_time=hourly_stats.to_time, intervals=stats)


class OrderStatsService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    async def _resolve_scope_node(self, *, conn: Connection, node: Node, subnode_id: Optional[int]) -> Node:
        if subnode_id is None or subnode_id == node.id:
            return node

        scope_node = await fetch_node(conn=conn, node_id=subnode_id)
        if scope_node is None:
            raise InvalidArgument("Selected subnode does not exist")
        if node.id not in scope_node.parent_ids:
            raise InvalidArgument("Selected subnode is not in the current node subtree")

        return scope_node

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_available_dates(self, *, conn: Connection, node: Node, subnode_id: Optional[int] = None) -> list[str]:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=subnode_id)

        dates = await _timed_stats_query(
            query_name="get_available_dates",
            node_id=scope_node.id,
            query_coro=conn.fetch(
                "SELECT DISTINCT date(o.booked_at)::text as date "
                "FROM ordr o "
                "JOIN till t ON o.till_id = t.id "
                "JOIN node n ON n.id = t.node_id "
                "WHERE ($1 = ANY(n.parent_ids) OR n.id = $1) "
                "ORDER BY date DESC",
                scope_node.id,
            ),
        )
        return [row["date"] for row in dates]

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_entry_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> TimeseriesStats:
        if node.event is None:
            raise InvalidArgument("Entry stats can only be computed for event nodes")

        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_entry_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)
        return TimeseriesStats(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            hourly_intervals=hourly_stats.intervals,
            daily_intervals=daily_stats.intervals,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_top_up_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> TimeseriesStats:
        if node.event is None:
            raise InvalidArgument("Top up stats can only be computed for event nodes")

        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_top_up_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)
        return TimeseriesStats(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            hourly_intervals=hourly_stats.intervals,
            daily_intervals=daily_stats.intervals,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_pay_out_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> TimeseriesStats:
        if node.event is None:
            raise InvalidArgument("Top up stats can only be computed for event nodes")

        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_pay_out_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)
        return TimeseriesStats(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            hourly_intervals=hourly_stats.intervals,
            daily_intervals=daily_stats.intervals,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_voucher_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> VoucherStats:
        if node.event is None:
            raise InvalidArgument("voucher stats can only be computed for event nodes")

        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        stats = await _timed_stats_query(
            query_name="get_voucher_stats",
            node_id=scope_node.event_node_id,
            till_id=query.till_id,
            from_time=from_time,
            to_time=to_time,
            query_coro=conn.fetch_one(
                VoucherStats,
                "select "
                "   coalesce(sum(case when sa.type = 'voucher_create' then t.vouchers else 0 end), 0) as vouchers_issued, "
                "   coalesce(sum(case when sa.type != 'voucher_create' then t.vouchers else 0 end), 0) as vouchers_spent "
                "from transaction t "
                "join account sa on t.source_account = sa.id "
                "join account ta on t.target_account = ta.id "
                "where t.booked_at >= $1 and t.booked_at <= $2"
                "   and sa.node_id = $3"
                "   and ($4::int IS NULL OR t.till_id = $4)",
                from_time,
                to_time,
                scope_node.event_node_id,
                query.till_id,
            ),
        )

        return stats

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_product_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> ProductStats:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)
        hourly_stats = await get_hourly_sales_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)

        hourly_product_stats = await get_hourly_product_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time, returnable=False
        )
        hourly_deposit_stats = await get_hourly_product_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time, returnable=True
        )

        product_overall_stats = []
        for hourly_product in hourly_product_stats:
            s = ProductOverallStats(
                product_id=hourly_product.product_id, count=0, revenue=0, product_name=hourly_product.product_name
            )
            for interval in hourly_product.intervals:
                s.count += interval.count  # pylint: disable=no-member
                s.revenue += interval.revenue  # pylint: disable=no-member
            product_overall_stats.append(s)

        deposit_overall_stats = []
        for hourly_deposit in hourly_deposit_stats:
            s = ProductOverallStats(
                product_id=hourly_deposit.product_id, count=0, revenue=0, product_name=hourly_deposit.product_name
            )
            for interval in hourly_deposit.intervals:
                s.count += interval.count  # pylint: disable=no-member
                s.revenue += interval.revenue  # pylint: disable=no-member
            deposit_overall_stats.append(s)

        return ProductStats(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            hourly_intervals=hourly_stats.intervals,
            daily_intervals=daily_stats.intervals,
            product_hourly_intervals=hourly_product_stats,
            product_overall_stats=product_overall_stats,
            deposit_hourly_intervals=hourly_deposit_stats,
            deposit_overall_stats=deposit_overall_stats,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.view_node_stats])
    async def get_revenue_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> RevenueStats:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)
        hourly_stats = await get_hourly_sales_stats(
            conn=conn, node=scope_node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)

        return RevenueStats(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            hourly_intervals=hourly_stats.intervals,
            daily_intervals=daily_stats.intervals,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_dashboard_overview(
        self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery
    ) -> DashboardOverview:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        if scope_node.ids_to_event_node is None:
            raise InvalidArgument("Dashboard overview can only be computed for nodes within an event")

        dashboard_stats = await _timed_stats_query(
            query_name="get_dashboard_overview",
            node_id=scope_node.id,
            till_id=query.till_id,
            from_time=from_time,
            to_time=to_time,
            query_coro=conn.fetchrow(
                "WITH scope_tills AS MATERIALIZED ("
                "    SELECT t.id "
                "    FROM till t "
                "    JOIN node n ON n.id = t.node_id "
                "    WHERE ($3 = ANY(n.parent_ids) OR n.id = $3)"
                "), "
                "filtered_orders AS MATERIALIZED ("
                "    SELECT o.id, o.customer_account_id "
                "    FROM ordr o "
                "    JOIN scope_tills st ON st.id = o.till_id "
                "    WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "      AND o.order_type = 'sale' "
                "      AND ($4::int IS NULL OR o.till_id = $4) "
                "), "
                "revenue_orders AS MATERIALIZED ("
                "    SELECT o.id "
                "    FROM ordr o "
                "    JOIN scope_tills st ON st.id = o.till_id "
                "    WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "      AND o.order_type IN ('sale', 'cancel_sale') "
                "      AND ($4::int IS NULL OR o.till_id = $4) "
                "), "
                "filtered_revenue AS MATERIALIZED ("
                "    SELECT COALESCE(ROUND(SUM(li.total_price), 2), 0) AS total_revenue "
                "    FROM revenue_orders ro "
                "    JOIN line_item li ON li.order_id = ro.id "
                "    JOIN product p ON p.id = li.product_id "
                "    WHERE p.type = 'user_defined'"
                ") "
                "SELECT "
                "   COALESCE((SELECT SUM(balance) FROM account WHERE balance > 0 AND type = 'private' AND node_id = ANY($5)), 0) "
                "       AS total_guest_credit, "
                "   COALESCE((SELECT total_revenue FROM filtered_revenue), 0) "
                "       AS total_revenue, "
                "   COALESCE((SELECT COUNT(DISTINCT customer_account_id) "
                "             FROM filtered_orders "
                "             WHERE customer_account_id IS NOT NULL), 0) "
                "       AS guests_with_orders, "
                "   COALESCE((SELECT COUNT(*) "
                "             FROM account "
                "             WHERE type = 'private' AND node_id = ANY($5) AND balance > 0), 0) "
                "       AS guests_with_credit, "
                "   COALESCE((SELECT COUNT(DISTINCT t.source_account) "
                "             FROM transaction t "
                "             JOIN account source_account ON t.source_account = source_account.id "
                "             JOIN account target_account ON t.target_account = target_account.id "
                "             WHERE t.booked_at >= $1 AND t.booked_at <= $2 "
                "               AND source_account.type = 'private' "
                "               AND source_account.node_id = ANY($5) "
                "               AND target_account.type IN ('cash_exit', 'sepa_exit', 'donation_exit')), 0) "
                "       AS guests_paid_out, "
                "   COALESCE((SELECT SUM(p.donation) "
                "             FROM payout p "
                "             JOIN account a ON p.customer_account_id = a.id "
                "             WHERE a.node_id = ANY($5) AND p.payout_run_id IS NOT NULL), 0) "
                "       AS online_donation, "
                "   COALESCE((SELECT SUM(c.balance) "
                "             FROM customers_without_payout_run c "
                "             WHERE c.node_id = ANY($5) AND c.payout_export = true), 0) "
                "       AS online_for_payout",
                from_time,
                to_time,
                scope_node.id,
                query.till_id,
                scope_node.ids_to_event_node,
            ),
        )

        return DashboardOverview(
            total_guest_credit=float(dashboard_stats["total_guest_credit"] or 0),
            total_revenue=float(dashboard_stats["total_revenue"] or 0),
            guests_with_orders=int(dashboard_stats["guests_with_orders"] or 0),
            guests_with_credit=int(dashboard_stats["guests_with_credit"] or 0),
            guests_paid_out=int(dashboard_stats["guests_paid_out"] or 0),
            online_donation=float(dashboard_stats["online_donation"] or 0),
            online_for_payout=float(dashboard_stats["online_for_payout"] or 0),
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_revenue_by_counter(
        self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery
    ) -> RevenueByCounter:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        result = await _timed_stats_query(
            query_name="get_revenue_by_counter",
            node_id=scope_node.id,
            till_id=query.till_id,
            from_time=from_time,
            to_time=to_time,
            query_coro=conn.fetch(
                "WITH scope_tills AS MATERIALIZED ("
                "    SELECT t.id "
                "    FROM till t "
                "    JOIN node n ON n.id = t.node_id "
                "    WHERE ($3 = ANY(n.parent_ids) OR n.id = $3)"
                ") "
                "SELECT t.id as till_id, t.name as till_name, "
                "COALESCE(SUM(li.total_price), 0) as revenue, "
                "COUNT(DISTINCT o.id) as order_count "
                "FROM ordr o "
                "JOIN till t ON o.till_id = t.id "
                "JOIN scope_tills st ON st.id = t.id "
                "LEFT JOIN line_item li ON li.order_id = o.id "
                "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "AND ($4::int IS NULL OR o.till_id = $4) "
                "AND o.order_type = 'sale' "
                "AND t.is_virtual IS NOT TRUE "
                "AND t.name <> 'CheckTerminal' "
                "GROUP BY t.id, t.name "
                "ORDER BY revenue DESC",
                from_time,
                to_time,
                scope_node.id,
                query.till_id,
            ),
        )

        counters = [
            CounterRevenue(
                till_id=row["till_id"],
                till_name=row["till_name"],
                revenue=float(row["revenue"]),
                order_count=int(row["order_count"]),
            )
            for row in result
        ]

        total_revenue = sum(counter.revenue for counter in counters)

        return RevenueByCounter(counters=counters, total_revenue=total_revenue)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_payment_method_stats(
        self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery
    ) -> PaymentMethodBreakdown:
        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)
        from_time, to_time = get_event_time_bounds(query, event)

        result = await _timed_stats_query(
            query_name="get_payment_method_stats",
            node_id=scope_node.id,
            till_id=query.till_id,
            from_time=from_time,
            to_time=to_time,
            query_coro=conn.fetch(
                "WITH scope_tills AS MATERIALIZED ("
                "    SELECT t.id "
                "    FROM till t "
                "    JOIN node n ON n.id = t.node_id "
                "    WHERE ($3 = ANY(n.parent_ids) OR n.id = $3)"
                ") "
                "SELECT o.payment_method, "
                "COALESCE(SUM(li.total_price), 0) as revenue, "
                "COUNT(DISTINCT o.id) as order_count "
                "FROM ordr o "
                "JOIN scope_tills st ON st.id = o.till_id "
                "LEFT JOIN line_item li ON li.order_id = o.id "
                "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "AND o.order_type = 'top_up' "
                "AND ($4::int IS NULL OR o.till_id = $4) "
                "GROUP BY o.payment_method "
                "ORDER BY revenue DESC",
                from_time,
                to_time,
                scope_node.id,
                query.till_id,
            ),
        )

        methods = [
            PaymentMethodStats(
                payment_method=row["payment_method"],
                revenue=float(row["revenue"]),
                order_count=int(row["order_count"]),
            )
            for row in result
        ]

        total_revenue = sum(method.revenue for method in methods)

        return PaymentMethodBreakdown(methods=methods, total_revenue=total_revenue)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_revenue_prediction(
        self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery
    ) -> RevenuePrediction:
        """
        Calculate revenue prediction based on historical data from the same customer's events.
        Falls back to system-wide data if no customer-specific data is available.
        """
        if node.event is None:
            raise InvalidArgument("Revenue prediction can only be computed for event nodes")

        scope_node = await self._resolve_scope_node(conn=conn, node=node, subnode_id=query.subnode_id)
        event = await fetch_event_for_node(conn=conn, node=scope_node)

        # Get current time and hour/minute from database using same timezone as order extraction
        # Use EXTRACT with AT TIME ZONE to ensure consistency with order hour extraction.
        # Use session timezone (current_setting('TIMEZONE')) - PostgreSQL does not support 'localtime'.
        db_result = await _timed_stats_query(
            query_name="get_revenue_prediction_now",
            node_id=scope_node.id,
            query_coro=conn.fetchrow(
                """SELECT
                    now() as db_now,
                    EXTRACT(HOUR FROM now() AT TIME ZONE current_setting('TIMEZONE')) as current_hour,
                    EXTRACT(MINUTE FROM now() AT TIME ZONE current_setting('TIMEZONE')) as current_minute
                """
            ),
        )
        now = db_result["db_now"] if db_result else datetime.now(tz=timezone.utc)
        current_hour = int(db_result["current_hour"]) if db_result else now.hour
        current_minute = int(db_result["current_minute"]) if db_result else now.minute

        # Calculate today's start time based on daily_end_time
        if event.daily_end_time:
            daily_end_hour = event.daily_end_time.hour
            daily_end_minute = event.daily_end_time.minute
            if current_hour < daily_end_hour or (current_hour == daily_end_hour and current_minute < daily_end_minute):
                # We're in the "late night" hours that belong to the previous day
                today_start = (now - timedelta(days=1)).replace(
                    hour=daily_end_hour, minute=daily_end_minute, second=0, microsecond=0
                )
            else:
                today_start = now.replace(hour=daily_end_hour, minute=daily_end_minute, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1) - timedelta(seconds=1)
        else:
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1) - timedelta(seconds=1)

        # Find customer node (first node after root)
        # parent_ids[0] is root (id=0), parent_ids[1] is customer node
        customer_node_id: Optional[int] = None
        if len(scope_node.parent_ids) >= 2:
            customer_node_id = scope_node.parent_ids[1]
        elif len(scope_node.parent_ids) == 1 and scope_node.parent_ids[0] == 0:
            # This node is directly under root - it IS the customer node
            customer_node_id = scope_node.id

        # Try to get historical data from customer's events first
        data_source = "customer"
        historical_data = []
        events_used = 0

        if customer_node_id is not None:
            history_start = today_start - timedelta(days=REVENUE_PREDICTION_MAX_HISTORY_DAYS)
            # Query all historical hourly revenue from events under the customer node
            # Exclude the current day (using session timezone for consistency)
            historical_data = await _timed_stats_query(
                query_name="get_revenue_prediction_history_customer",
                node_id=customer_node_id,
                from_time=history_start,
                to_time=today_start,
                query_coro=conn.fetch(
                    """
                    WITH scope_tills AS MATERIALIZED (
                        SELECT t.id, n.event_node_id
                        FROM till t
                        JOIN node n ON n.id = t.node_id
                        WHERE ($1 = ANY(n.parent_ids) OR n.id = $1)
                    )
                    SELECT
                        EXTRACT(HOUR FROM o.booked_at AT TIME ZONE current_setting('TIMEZONE')) as hour,
                        DATE(o.booked_at AT TIME ZONE current_setting('TIMEZONE')) as day,
                        e.id as event_id,
                        COALESCE(SUM(li.total_price), 0) as revenue
                    FROM ordr o
                    JOIN scope_tills st ON st.id = o.till_id
                    JOIN line_item li ON o.id = li.order_id
                    JOIN node event_node ON st.event_node_id = event_node.id
                    JOIN event e ON event_node.event_id = e.id
                    WHERE o.payment_method = 'tag'
                        AND o.order_type = 'sale'
                        AND o.booked_at >= $3
                        AND o.booked_at < $2
                    GROUP BY hour, day, e.id
                    ORDER BY day, hour
                    """,
                    customer_node_id,
                    today_start,
                    history_start,
                ),
            )
            events_used = len(set(row["event_id"] for row in historical_data))

        # Fallback to system-wide data if no customer data
        if not historical_data:
            data_source = "system"
            history_start = today_start - timedelta(days=REVENUE_PREDICTION_MAX_HISTORY_DAYS)
            historical_data = await _timed_stats_query(
                query_name="get_revenue_prediction_history_system",
                node_id=scope_node.id,
                from_time=history_start,
                to_time=today_start,
                query_coro=conn.fetch(
                    """
                    SELECT
                        EXTRACT(HOUR FROM o.booked_at AT TIME ZONE current_setting('TIMEZONE')) as hour,
                        DATE(o.booked_at AT TIME ZONE current_setting('TIMEZONE')) as day,
                        n.event_node_id as event_id,
                        COALESCE(SUM(li.total_price), 0) as revenue
                    FROM ordr o
                    JOIN line_item li ON o.id = li.order_id
                    JOIN till t ON o.till_id = t.id
                    JOIN node n ON t.node_id = n.id
                    WHERE o.payment_method = 'tag'
                        AND o.order_type = 'sale'
                        AND o.booked_at >= $2
                        AND o.booked_at < $1
                        AND n.event_node_id IS NOT NULL
                    GROUP BY hour, day, n.event_node_id
                    ORDER BY day, hour
                    """,
                    today_start,
                    history_start,
                ),
            )
            events_used = len(set(row["event_id"] for row in historical_data if row["event_id"]))

        # Get current day's revenue by hour (using session timezone for hour extraction)
        current_day_stats = await _timed_stats_query(
            query_name="get_revenue_prediction_current_day_hourly",
            node_id=scope_node.id,
            till_id=query.till_id,
            from_time=today_start,
            to_time=now,
            query_coro=conn.fetch(
                """
                WITH scope_tills AS MATERIALIZED (
                    SELECT t.id
                    FROM till t
                    JOIN node n ON n.id = t.node_id
                    WHERE ($1 = ANY(n.parent_ids) OR n.id = $1)
                )
                SELECT
                    EXTRACT(HOUR FROM o.booked_at AT TIME ZONE current_setting('TIMEZONE')) as hour,
                    COALESCE(SUM(li.total_price), 0) as revenue
                FROM ordr o
                JOIN scope_tills st ON st.id = o.till_id
                LEFT JOIN line_item li ON li.order_id = o.id
                WHERE o.payment_method = 'tag'
                    AND o.order_type = 'sale'
                    AND o.booked_at >= $2
                    AND o.booked_at <= now()
                    AND ($3::int IS NULL OR o.till_id = $3)
                GROUP BY hour
                ORDER BY hour
                """,
                scope_node.id,
                today_start,
                query.till_id,
            ),
        )

        # Build hourly revenue map for today
        today_hourly: dict[int, float] = {int(row["hour"]): float(row["revenue"]) for row in current_day_stats}
        current_revenue = sum(today_hourly.values())

        # Calculate current cumulative by hour
        cumulative_actual: dict[int, float] = {}
        running_total = 0.0
        for h in range(24):
            if h in today_hourly:
                running_total += today_hourly[h]
            cumulative_actual[h] = running_total if h <= current_hour else None  # type: ignore

        # Build hourly profile from historical data
        # Group by day to get daily totals, then calculate percentages
        daily_totals: dict[str, float] = {}
        daily_hourly: dict[str, dict[int, float]] = {}

        for row in historical_data:
            day_key = str(row["day"])
            hour = int(row["hour"])
            revenue = float(row["revenue"])

            if day_key not in daily_totals:
                daily_totals[day_key] = 0.0
                daily_hourly[day_key] = {}

            daily_totals[day_key] += revenue
            daily_hourly[day_key][hour] = daily_hourly[day_key].get(hour, 0.0) + revenue

        # Calculate average daily revenue
        days_of_data = len(daily_totals)
        average_daily_revenue = sum(daily_totals.values()) / days_of_data if days_of_data > 0 else 0.0

        # Build cumulative hourly profile (average % of daily revenue by each hour)
        hourly_profile: dict[int, float] = {}  # hour -> cumulative percentage
        if days_of_data > 0:
            for h in range(24):
                cumulative_pcts = []
                for day_key, day_total in daily_totals.items():
                    if day_total > 0:
                        cumulative = sum(daily_hourly[day_key].get(hr, 0.0) for hr in range(h + 1))
                        cumulative_pcts.append(cumulative / day_total)
                hourly_profile[h] = sum(cumulative_pcts) / len(cumulative_pcts) if cumulative_pcts else 0.0
        else:
            # Linear fallback if no historical data
            for h in range(24):
                hourly_profile[h] = (h + 1) / 24.0

        # Calculate predicted end of day
        current_hour_pct = hourly_profile.get(current_hour, 0.5)
        if current_hour_pct > 0 and current_revenue > 0:
            predicted_end_of_day = current_revenue / current_hour_pct
        elif average_daily_revenue > 0:
            predicted_end_of_day = average_daily_revenue
        else:
            # Simple linear extrapolation based on hours elapsed
            hours_elapsed = current_hour + 1
            if hours_elapsed > 0 and current_revenue > 0:
                predicted_end_of_day = (current_revenue / hours_elapsed) * 24
            else:
                predicted_end_of_day = 0.0

        # Calculate predicted event total
        # Estimate remaining days based on event dates
        remaining_days = 0
        if event.end_date and event.start_date:
            total_event_days = (event.end_date - event.start_date).days + 1
            # Convert both to naive datetime for comparison (remove timezone info)
            start_date_naive = event.start_date.replace(tzinfo=None) if event.start_date.tzinfo else event.start_date
            now_naive = now.replace(tzinfo=None) if now.tzinfo else now
            elapsed_days = (now_naive - start_date_naive).days
            remaining_days = max(0, total_event_days - elapsed_days - 1)  # -1 because today is predicted separately

        predicted_event_total = predicted_end_of_day + (average_daily_revenue * remaining_days)

        # Determine confidence level
        if days_of_data >= 3 and data_source == "customer":
            confidence_level = "high"
        elif days_of_data >= 1:
            confidence_level = "medium"
        else:
            confidence_level = "low"

        # Generate hourly timeseries for chart
        hourly_timeseries: list[HourlyPredictionPoint] = []
        for h in range(24):
            predicted_cumulative = predicted_end_of_day * hourly_profile.get(h, (h + 1) / 24.0)
            actual_cumulative = cumulative_actual.get(h)

            hourly_timeseries.append(
                HourlyPredictionPoint(
                    hour=h,
                    actual_revenue=today_hourly.get(h) if h <= current_hour else None,
                    predicted_revenue=predicted_end_of_day * (hourly_profile.get(h, 0) - hourly_profile.get(h - 1, 0))
                    if h > 0
                    else predicted_end_of_day * hourly_profile.get(0, 0),
                    cumulative_actual=actual_cumulative,
                    cumulative_predicted=round(predicted_cumulative, 2),
                )
            )

        # Visitor-based prediction calculations
        expected_visitors_per_day = event.expected_visitors_per_day

        # Count actual visitors today (unique customer accounts with orders)
        actual_visitors_result = await _timed_stats_query(
            query_name="get_revenue_prediction_actual_visitors",
            node_id=scope_node.id,
            from_time=today_start,
            to_time=now,
            query_coro=conn.fetchval(
                """
                SELECT COUNT(DISTINCT o.customer_account_id)
                FROM ordr o
                JOIN till t ON o.till_id = t.id
                JOIN node n ON n.id = t.node_id
                WHERE o.payment_method = 'tag'
                    AND o.order_type = 'sale'
                    AND o.booked_at >= $2
                    AND o.booked_at <= $3
                    AND ($1 = ANY(n.parent_ids) OR n.id = $1)
                    AND o.customer_account_id IS NOT NULL
                """,
                scope_node.id,
                today_start,
                now,
            ),
        )
        actual_visitors_today = int(actual_visitors_result) if actual_visitors_result else 0

        # Calculate revenue per visitor: Total Revenue / Guests with Orders (current event)
        historical_revenue_per_visitor: Optional[float] = None
        visitor_based_prediction: Optional[float] = None

        # Get total revenue and guest count for current event
        event_stats_from = event.start_date or datetime(year=1970, month=1, day=1, tzinfo=timezone.utc)
        event_stats_to = now
        event_stats = await _timed_stats_query(
            query_name="get_revenue_prediction_event_stats",
            node_id=scope_node.id,
            from_time=event_stats_from,
            to_time=event_stats_to,
            query_coro=conn.fetchrow(
                """
                WITH scope_tills AS MATERIALIZED (
                    SELECT t.id
                    FROM till t
                    JOIN node n ON n.id = t.node_id
                    WHERE ($1 = ANY(n.parent_ids) OR n.id = $1)
                )
                SELECT
                    COALESCE(SUM(li.total_price), 0) as total_revenue,
                    COUNT(DISTINCT o.customer_account_id) as guests_with_orders
                FROM ordr o
                JOIN scope_tills st ON st.id = o.till_id
                LEFT JOIN line_item li ON li.order_id = o.id
                WHERE o.payment_method = 'tag'
                    AND o.order_type = 'sale'
                    AND o.booked_at >= $2
                    AND o.booked_at <= $3
                    AND o.customer_account_id IS NOT NULL
                """,
                scope_node.id,
                event_stats_from,
                event_stats_to,
            ),
        )

        if event_stats and event_stats["guests_with_orders"] > 0:
            total_revenue = float(event_stats["total_revenue"])
            guests_with_orders = int(event_stats["guests_with_orders"])
            historical_revenue_per_visitor = round(total_revenue / guests_with_orders, 2)

            # If expected visitors is configured, calculate visitor-based prediction
            if expected_visitors_per_day:
                visitor_based_prediction = round(expected_visitors_per_day * historical_revenue_per_visitor, 2)

        return RevenuePrediction(
            current_revenue=round(current_revenue, 2),
            predicted_end_of_day=round(predicted_end_of_day, 2),
            predicted_event_total=round(predicted_event_total, 2),
            confidence_level=confidence_level,
            hours_of_data=sum(len(dh) for dh in daily_hourly.values()),
            days_of_data=days_of_data,
            events_used=events_used,
            data_source=data_source,
            hourly_timeseries=hourly_timeseries,
            average_daily_revenue=round(average_daily_revenue, 2),
            expected_visitors_per_day=expected_visitors_per_day,
            actual_visitors_today=actual_visitors_today,
            historical_revenue_per_visitor=historical_revenue_per_visitor,
            visitor_based_prediction=visitor_based_prediction,
        )
