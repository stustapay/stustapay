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


def get_event_time_bounds(query: TimeseriesStatsQuery, event: PublicEventSettings) -> tuple[datetime, datetime]:
    if query.from_time is not None and query.to_time is not None and query.from_time > query.to_time:
        raise InvalidArgument("Stats start time must be before end time")

    from_t = query.from_time or event.start_date or datetime(year=1970, month=1, day=1)
    to_t = query.to_time or event.end_date or datetime(year=4000, month=1, day=1)
    return from_t, to_t


async def get_hourly_entry_stats(*, conn: Connection, node: Node, from_time: datetime, to_time: datetime) -> Timeseries:
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
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_top_up_stats(
    *, conn: Connection, node: Node, from_time: datetime, to_time: datetime
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
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        top_up_product.id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_pay_out_stats(
    *, conn: Connection, node: Node, from_time: datetime, to_time: datetime
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
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
        pay_out_product.id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_sales_stats(*, conn: Connection, node: Node, from_time: datetime, to_time: datetime) -> Timeseries:
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
        "group by from_time, to_time "
        "order by from_time",
        from_time,
        to_time,
        node.id,
    )

    return Timeseries(from_time=from_time, to_time=to_time, intervals=stats)


async def get_hourly_product_stats(
    *, conn: Connection, node: Node, from_time: datetime, to_time: datetime, returnable=False
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
        "group by p.id, from_time, to_time "
        "order by from_time) s "
        "join product prod on s.product_id = prod.id "
        "join node nod on prod.node_id = nod.id",
        from_time,
        to_time,
        node.id,
        returnable,
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
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_entry_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> TimeseriesStats:
        if node.event is None:
            raise InvalidArgument("Entry stats can only be computed for event nodes")

        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)

        hourly_stats = await get_hourly_entry_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
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

        hourly_stats = await get_hourly_top_up_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
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

        hourly_stats = await get_hourly_pay_out_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
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
            "   and sa.node_id = $3",
            from_time,
            to_time,
            node.event_node_id,
        )

        return stats

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration, Privilege.view_node_stats])
    async def get_product_stats(self, *, conn: Connection, node: Node, query: TimeseriesStatsQuery) -> ProductStats:
        event = await fetch_event_for_node(conn=conn, node=node)
        from_time, to_time = get_event_time_bounds(query, event)
        hourly_stats = await get_hourly_sales_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
        daily_stats = await get_daily_stats(hourly_stats=hourly_stats, event=event)

        hourly_product_stats = await get_hourly_product_stats(
            conn=conn, node=node, from_time=from_time, to_time=to_time, returnable=False
        )
        hourly_deposit_stats = await get_hourly_product_stats(
            conn=conn, node=node, from_time=from_time, to_time=to_time, returnable=True
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
        hourly_stats = await get_hourly_sales_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
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
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 AND o.payment_method = 'tag'",
            from_time,
            to_time,
            node.id,
        )

        # Number of guests with orders
        guests_with_orders = await conn.fetchval(
            "SELECT COUNT(DISTINCT o.customer_account_id) "
            "FROM orders_at_node_and_children($3) o "
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 AND o.customer_account_id IS NOT NULL",
            from_time,
            to_time,
            node.id,
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

        result = await conn.fetch(
            "SELECT t.id as till_id, t.name as till_name, "
            "COALESCE(SUM(li.total_price), 0) as revenue, "
            "COUNT(DISTINCT o.id) as order_count "
            "FROM orders_at_node_and_children($3) o "
            "JOIN till t ON o.till_id = t.id "
            "JOIN line_item li ON o.id = li.order_id "
            "WHERE o.booked_at >= $1 AND o.booked_at <= $2 "
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
            "GROUP BY o.payment_method "
            "ORDER BY revenue DESC",
            from_time,
            to_time,
            node.id,
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
