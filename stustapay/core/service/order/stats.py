from datetime import datetime, timedelta
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
from stustapay.core.service.tree.common import fetch_event_for_node


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

    from_t = query.from_time or event.start_date or datetime(year=1970, month=1, day=1)
    to_t = query.to_time or event.end_date or datetime(year=4000, month=1, day=1)
    return from_t, to_t


async def get_hourly_entry_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    stats = await conn.fetch_many(
        StatInterval,
        "select "
        "   date_trunc('hour', o.booked_at) as from_time, "
        "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
        "   sum(li.quantity) as count,"
        "   round(sum(li.total_price), 2) as revenue "
        "from orders_at_node_and_children($3) o "
        "join line_item li on o.id = li.order_id "
        "join product p on li.product_id = p.id "
        "where p.ticket_metadata_id is not null and o.booked_at >= $1 and o.booked_at <= $2 "
        "   and ($4::int IS NULL OR o.till_id = $4) "
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        query.till_id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_top_up_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    top_up_product = await fetch_top_up_product(conn=conn, node=node)

    stats = await conn.fetch_many(
        StatInterval,
        "select "
        "   date_trunc('hour', o.booked_at) as from_time, "
        "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
        "   sum(li.quantity) as count,"
        "   round(sum(li.total_price), 2) as revenue "
        "from orders_at_node_and_children($3) o "
        "join line_item li on o.id = li.order_id "
        "join product p on li.product_id = p.id "
        "where p.id = $4 and o.booked_at >= $1 and o.booked_at <= $2 "
        "   and ($5::int IS NULL OR o.till_id = $5) "
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        top_up_product.id,
        query.till_id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_pay_out_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime
) -> Timeseries:
    pay_out_product = await fetch_pay_out_product(conn=conn, node=node)

    stats = await conn.fetch_many(
        StatInterval,
        "select "
        "   date_trunc('hour', o.booked_at) as from_time, "
        "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
        "   sum(li.quantity) as count,"
        "   round(sum(li.total_price), 2) as revenue "
        "from orders_at_node_and_children($3) o "
        "join line_item li on o.id = li.order_id "
        "join product p on li.product_id = p.id "
        "where p.id = $4 and o.booked_at >= $1 and o.booked_at <= $2 "
        "   and ($5::int IS NULL OR o.till_id = $5) "
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        pay_out_product.id,
        query.till_id,
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

    stats = await conn.fetch_many(
        StatInterval,
        "select "
        "   date_trunc('hour', o.booked_at) as from_time, "
        "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
        "   sum(li.quantity) as count,"
        "   round(sum(li.total_price), 2) as revenue "
        "from orders_at_node_and_children($3) o "
        "join line_item li on o.id = li.order_id "
        "where o.booked_at >= $1 and o.booked_at <= $2 and o.payment_method = 'tag' "
        "   and ($4::int IS NULL OR o.till_id = $4) "
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        query.till_id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_product_stats(
    *, conn: Connection, node: Node, query: TimeseriesStatsQuery, from_time: datetime, to_time: datetime, returnable=False
) -> list[ProductTimeseries]:
    result = await conn.fetch(
        "select s.*, prod.name as product_name "
        "from (select "
        "   p.id as product_id, "
        "   date_trunc('hour', o.booked_at) as from_time, "
        "   date_trunc('hour', o.booked_at) + interval '1 hour' as to_time, "
        "   sum(li.quantity) as count,"
        "   round(sum(li.total_price), 2) as revenue "
        "from order_value o "
        "join till t on o.till_id = t.id "
        "join line_item li on o.id = li.order_id "
        "join product p on li.product_id = p.id "
        "join node n on t.node_id = n.id "
        "where o.booked_at >= $1 and o.booked_at <= $2 "
        "   and p.type = 'user_defined' "
        "   and ($3 = any(n.parent_ids) or n.id = $3) "
        "   and p.is_returnable = $4 "
        "   and ($5::int IS NULL OR o.till_id = $5) "
        "group by p.id, from_time, to_time "
        "order by from_time) s "
        "join product prod on s.product_id = prod.id "
        "join node nod on prod.node_id = nod.id",
        from_time,
        to_time,
        node.id,
        returnable,
        query.till_id,
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
    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_available_dates(self, *, conn: Connection, node: Node) -> list[str]:
        dates = await conn.fetch(
            "SELECT DISTINCT date(o.booked_at)::text as date "
            "FROM orders_at_node_and_children($1) o "
            "ORDER BY date DESC",
            node.id,
        )
        return [row["date"] for row in dates]
    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_entry_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> TimeseriesStats:
        if node.event is None:
            raise InvalidArgument("Entry stats can only be computed for event nodes")

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_entry_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
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

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_top_up_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
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

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_pay_out_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
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

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        stats = await conn.fetch_one(
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
            node.event_node_id,
            query.till_id,
        )

        return stats

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_product_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> ProductStats:
        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)
        hourly_stats = await get_hourly_sales_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
        )
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)

        hourly_product_stats = await get_hourly_product_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time, returnable=False
        )
        hourly_deposit_stats = await get_hourly_product_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time, returnable=True
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
        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)
        hourly_stats = await get_hourly_sales_stats(
            conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
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
        if node.event is None:
            raise InvalidArgument("Dashboard overview can only be computed for event nodes")

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        if node.ids_to_event_node is None:
            raise InvalidArgument("Dashboard overview can only be computed for nodes within an event")

        # Total guest credit (sum of all customer account balances)
        total_guest_credit = await conn.fetchval(
            "SELECT COALESCE(SUM(balance), 0) FROM account WHERE type = 'private' AND node_id = ANY($1)",
            node.ids_to_event_node,
        )

        # Total revenue from sales in date range
        total_revenue = await conn.fetchval(
            "SELECT COALESCE(SUM(li.total_price), 0) "
            "FROM orders_at_node_and_children($3) o "
            "JOIN line_item li ON o.id = li.order_id "
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 AND o.payment_method = 'tag' "
            "AND ($4::int IS NULL OR o.till_id = $4)",
            from_time,
            to_time,
            node.id,
            query.till_id,
        )

        # Number of guests with orders
        guests_with_orders = await conn.fetchval(
            "SELECT COUNT(DISTINCT o.customer_account_id) "
            "FROM orders_at_node_and_children($3) o "
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 AND o.customer_account_id IS NOT NULL "
            "AND ($4::int IS NULL OR o.till_id = $4)",
            from_time,
            to_time,
            node.id,
            query.till_id,
        )

        # Guests with credit (balance > 0)
        guests_with_credit = await conn.fetchval(
            "SELECT COUNT(*) FROM account WHERE type = 'private' AND node_id = ANY($1) AND balance > 0",
            node.ids_to_event_node,
        )

        # Guests paid out (count of customers with payout transactions)
        guests_paid_out = await conn.fetchval(
            "SELECT COUNT(DISTINCT t.source_account) "
            "FROM transaction t "
            "JOIN account a ON t.source_account = a.id "
            "WHERE t.booked_at >= $1 AND t.booked_at <= $2 "
            "AND a.type = 'private' AND a.node_id = ANY($3) "
            "AND t.target_account IN (SELECT id FROM account WHERE type IN ('cash_exit', 'sepa_exit', 'donation_exit'))",
            from_time,
            to_time,
            node.ids_to_event_node,
        )

        # Online donation (sum of donations from payouts)
        online_donation = await conn.fetchval(
            "SELECT COALESCE(SUM(p.donation), 0) "
            "FROM payout p "
            "JOIN account a ON p.customer_account_id = a.id "
            "WHERE a.node_id = ANY($1) AND p.payout_run_id IS NOT NULL",
            node.ids_to_event_node,
        )

        # Online for payout (sum of pending payout amounts - customers without payout run)
        online_for_payout = await conn.fetchval(
            "SELECT COALESCE(SUM(c.balance), 0) "
            "FROM customers_without_payout_run c "
            "WHERE c.node_id = ANY($1) AND c.payout_export = true",
            node.ids_to_event_node,
        )

        return DashboardOverview(
            total_guest_credit=float(total_guest_credit or 0),
            total_revenue=float(total_revenue or 0),
            guests_with_orders=int(guests_with_orders or 0),
            guests_with_credit=int(guests_with_credit or 0),
            guests_paid_out=int(guests_paid_out or 0),
            online_donation=float(online_donation or 0),
            online_for_payout=float(online_for_payout or 0),
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_revenue_by_counter(
        self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery
    ) -> RevenueByCounter:
        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        # When filtering by a specific till, we want to show only that till
        # Otherwise, show all tills with orders in the time period
        if query.till_id is not None:
            result = await conn.fetch(
                "SELECT t.id as till_id, t.name as till_name, "
                "COALESCE(SUM(li.total_price), 0) as revenue, "
                "COUNT(DISTINCT o.id) as order_count "
                "FROM orders_at_node_and_children($3) o "
                "JOIN till t ON o.till_id = t.id "
                "JOIN line_item li ON o.id = li.order_id "
                "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "AND o.till_id = $4 "
                "AND o.order_type = 'sale' "
                "AND t.is_virtual IS NOT TRUE "
                "AND t.name <> 'CheckTerminal' "
                "GROUP BY t.id, t.name "
                "ORDER BY revenue DESC",
                from_time,
                to_time,
                node.id,
                query.till_id,
            )
        else:
            result = await conn.fetch(
                "SELECT t.id as till_id, t.name as till_name, "
                "COALESCE(SUM(li.total_price), 0) as revenue, "
                "COUNT(DISTINCT o.id) as order_count "
                "FROM orders_at_node_and_children($3) o "
                "JOIN till t ON o.till_id = t.id "
                "JOIN line_item li ON o.id = li.order_id "
                "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
                "AND o.order_type = 'sale' "
                "AND t.is_virtual IS NOT TRUE "
                "AND t.name <> 'CheckTerminal' "
                "GROUP BY t.id, t.name "
                "ORDER BY revenue DESC",
                from_time,
                to_time,
                node.id,
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
        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        result = await conn.fetch(
            "SELECT o.payment_method, "
            "COALESCE(SUM(o.total_price), 0) as revenue, "
            "COUNT(*) as order_count "
            "FROM orders_at_node_and_children($3) o "
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
            "AND ($4::int IS NULL OR o.till_id = $4) "
            "GROUP BY o.payment_method "
            "ORDER BY revenue DESC",
            from_time,
            to_time,
            node.id,
            query.till_id,
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

        event = await fetch_event_for_node(conn=conn, node=node)

        # Get current day's time bounds
        now = datetime.now(tz=event.start_date.tzinfo if event.start_date else None)
        current_hour = now.hour

        # Calculate today's start time based on daily_end_time
        if event.daily_end_time:
            daily_end_hour = event.daily_end_time.hour
            daily_end_minute = event.daily_end_time.minute
            if current_hour < daily_end_hour or (current_hour == daily_end_hour and now.minute < daily_end_minute):
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
        if len(node.parent_ids) >= 2:
            customer_node_id = node.parent_ids[1]
        elif len(node.parent_ids) == 1 and node.parent_ids[0] == 0:
            # This node is directly under root - it IS the customer node
            customer_node_id = node.id

        # Try to get historical data from customer's events first
        data_source = "customer"
        historical_data = []
        events_used = 0

        if customer_node_id is not None:
            # Query all historical hourly revenue from events under the customer node
            # Exclude the current day
            historical_data = await conn.fetch(
                """
                SELECT
                    EXTRACT(HOUR FROM o.booked_at) as hour,
                    DATE(o.booked_at) as day,
                    e.id as event_id,
                    COALESCE(SUM(li.total_price), 0) as revenue
                FROM ordr o
                JOIN line_item li ON o.id = li.order_id
                JOIN till t ON o.till_id = t.id
                JOIN node n ON t.node_id = n.id
                JOIN node event_node ON n.event_node_id = event_node.id
                JOIN event e ON event_node.event_id = e.id
                WHERE o.payment_method = 'tag'
                    AND o.booked_at < $2
                    AND ($1 = ANY(n.parent_ids) OR n.id = $1)
                GROUP BY hour, day, e.id
                ORDER BY day, hour
                """,
                customer_node_id,
                today_start,
            )
            events_used = len(set(row["event_id"] for row in historical_data))

        # Fallback to system-wide data if no customer data
        if not historical_data:
            data_source = "system"
            historical_data = await conn.fetch(
                """
                SELECT
                    EXTRACT(HOUR FROM o.booked_at) as hour,
                    DATE(o.booked_at) as day,
                    n.event_node_id as event_id,
                    COALESCE(SUM(li.total_price), 0) as revenue
                FROM ordr o
                JOIN line_item li ON o.id = li.order_id
                JOIN till t ON o.till_id = t.id
                JOIN node n ON t.node_id = n.id
                WHERE o.payment_method = 'tag'
                    AND o.booked_at < $1
                    AND n.event_node_id IS NOT NULL
                GROUP BY hour, day, n.event_node_id
                ORDER BY day, hour
                """,
                today_start,
            )
            events_used = len(set(row["event_id"] for row in historical_data if row["event_id"]))

        # Get current day's revenue by hour
        current_day_stats = await conn.fetch(
            """
            SELECT
                EXTRACT(HOUR FROM o.booked_at) as hour,
                COALESCE(SUM(li.total_price), 0) as revenue
            FROM orders_at_node_and_children($1) o
            JOIN line_item li ON o.id = li.order_id
            WHERE o.payment_method = 'tag'
                AND o.booked_at >= $2
                AND o.booked_at <= $3
                AND ($4::int IS NULL OR o.till_id = $4)
            GROUP BY hour
            ORDER BY hour
            """,
            node.id,
            today_start,
            now,
            query.till_id,
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
            elapsed_days = (now - event.start_date).days
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
        actual_visitors_result = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT o.customer_account_id)
            FROM orders_at_node_and_children($1) o
            WHERE o.payment_method = 'tag'
                AND o.booked_at >= $2
                AND o.booked_at <= $3
                AND o.customer_account_id IS NOT NULL
            """,
            node.id,
            today_start,
            now,
        )
        actual_visitors_today = int(actual_visitors_result) if actual_visitors_result else 0

        # Calculate historical revenue per visitor from historical data
        historical_revenue_per_visitor: Optional[float] = None
        visitor_based_prediction: Optional[float] = None

        if historical_data and days_of_data > 0:
            # Query historical visitor counts
            if customer_node_id is not None:
                historical_visitors = await conn.fetch(
                    """
                    SELECT
                        DATE(o.booked_at) as day,
                        COUNT(DISTINCT o.customer_account_id) as visitors,
                        COALESCE(SUM(li.total_price), 0) as revenue
                    FROM ordr o
                    JOIN line_item li ON o.id = li.order_id
                    JOIN till t ON o.till_id = t.id
                    JOIN node n ON t.node_id = n.id
                    WHERE o.payment_method = 'tag'
                        AND o.booked_at < $2
                        AND ($1 = ANY(n.parent_ids) OR n.id = $1)
                        AND o.customer_account_id IS NOT NULL
                    GROUP BY day
                    """,
                    customer_node_id,
                    today_start,
                )
            else:
                historical_visitors = await conn.fetch(
                    """
                    SELECT
                        DATE(o.booked_at) as day,
                        COUNT(DISTINCT o.customer_account_id) as visitors,
                        COALESCE(SUM(li.total_price), 0) as revenue
                    FROM ordr o
                    JOIN line_item li ON o.id = li.order_id
                    JOIN till t ON o.till_id = t.id
                    JOIN node n ON t.node_id = n.id
                    WHERE o.payment_method = 'tag'
                        AND o.booked_at < $1
                        AND n.event_node_id IS NOT NULL
                        AND o.customer_account_id IS NOT NULL
                    GROUP BY day
                    """,
                    today_start,
                )

            # Calculate average revenue per visitor across all historical days
            total_historical_visitors = sum(int(row["visitors"]) for row in historical_visitors if row["visitors"])
            total_historical_revenue = sum(float(row["revenue"]) for row in historical_visitors if row["revenue"])

            if total_historical_visitors > 0:
                historical_revenue_per_visitor = round(total_historical_revenue / total_historical_visitors, 2)

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
