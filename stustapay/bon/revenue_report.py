from datetime import datetime, time, timedelta, timezone

import pytz
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig, gen_dummy_order
from stustapay.bon.pdflatex import PdfRenderResult, pdflatex, render_template
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.order import LineItem, Order
from stustapay.core.schema.tree import Node, PublicEventSettings, RestrictedEventSettings
from stustapay.core.service.order.stats import (
    Timeseries,
    TimeseriesStatsQuery,
    get_daily_stats,
    get_hourly_sales_stats,
)
from stustapay.core.service.tree.common import fetch_event_for_node, fetch_node

REPORT_TIMEZONE = pytz.timezone("Europe/Berlin")
GERMAN_WEEKDAYS = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
]


class DailyRevenue(BaseModel):
    day: str
    revenue: float
    fees: float
    revenue_minus_fees: float


class ReportSummary(BaseModel):
    order_count: int
    average_order_value: float
    average_day_revenue: float
    top_day_label: str
    top_day_revenue: float


class ReportLineItem(BaseModel):
    quantity: int
    product_name: str
    unit_price: float
    total_price: float


class ReportOrderEntry(BaseModel):
    time_label: str
    transaction_id: str
    customer_tag_uid_hex: str | None
    total_price: float
    line_items: list[ReportLineItem]


class ReportDayGroup(BaseModel):
    date_label: str
    day_total: float
    orders: list[ReportOrderEntry]


class NodeReportContext(BaseModel):
    config: BonConfig
    orders: list[Order]
    daily_revenue_stats: list[DailyRevenue]
    summary: ReportSummary
    order_groups: list[ReportDayGroup]
    from_time: datetime
    to_time: datetime
    node: Node

    total_revenue: float
    fees: float
    fees_percent: float
    revenue_minus_fees: float

    currency_symbol: str


class OrderWithFees(Order):
    fees: float
    total_price_minus_fees: float


async def render_report(context: NodeReportContext):
    rendered = await render_template("revenue_report.tex", context, context.currency_symbol)
    return await pdflatex(file_content=rendered)


async def generate_dummy_report(node_id: int, event: RestrictedEventSettings) -> PdfRenderResult:
    """Generate a dummy bon for the given event and return the pdf as bytes"""
    fee = 0.01

    dummy_orders = [gen_dummy_order(node_id)]
    orders = [
        OrderWithFees(
            fees=dummy_order.total_price * fee,
            total_price_minus_fees=dummy_order.total_price - dummy_order.total_price * fee,
            **dummy_order.model_dump(),
        )
        for dummy_order in dummy_orders
    ]
    daily_revenue = [
        DailyRevenue(
            day="Donnerstag 2024-10-10",
            revenue=10212,
            fees=10212 * fee,
            revenue_minus_fees=10212 - 10212 * fee,
        ),
        DailyRevenue(
            day="Freitag 2024-10-11",
            revenue=3000.23,
            fees=3000.23 * fee,
            revenue_minus_fees=3000.23 - 3000.23 * fee,
        ),
    ]
    ctx = _build_report_context(
        config=BonConfig(
            title=event.bon_title,
            issuer=event.bon_issuer,
            address=event.bon_address,
            ust_id=event.ust_id,
        ),
        node=Node(
            id=10,
            parent=5,
            name="Falafelstand",
            description="Fancy falafel",
            read_only=False,
            event=None,
            path="/0/5/10",
            parent_ids=[0, 5],
            event_node_id=5,
            parents_until_event_node=[5],
            forbidden_objects_at_node=[],
            computed_forbidden_objects_at_node=[],
            forbidden_objects_in_subtree=[],
            computed_forbidden_objects_in_subtree=[],
            children=[],
        ),
        orders=orders,
        daily_revenue=daily_revenue,
        from_time=datetime.now(tz=REPORT_TIMEZONE) - timedelta(days=3),
        to_time=datetime.now(tz=REPORT_TIMEZONE),
        total=sum(day.revenue for day in daily_revenue),
        fees=fee,
        currency_symbol=get_currency_symbol(event.currency_identifier),
        daily_end_time=event.daily_end_time,
    )
    return await render_report(context=ctx)


def _check_order_revenue_consistency(hourly_sales_stats: Timeseries, orders: list[OrderWithFees], total: float):
    stats_sum = 0.0
    for interval in hourly_sales_stats.intervals:
        stats_sum += interval.revenue

    orders_sum = sum([o.total_price for o in orders])
    if abs(orders_sum - stats_sum) > 1e-09:
        raise RuntimeError(
            f"Revenue statistics are not consistent between order list and aggregated stats. Order sum: {orders_sum}, stats sum: {stats_sum}"
        )

    if abs(stats_sum - total) > 1e-09:
        raise RuntimeError(
            f"Revenue statistics are not consistent between computed total and aggregated stats. Stats sum: {stats_sum}, total: {total}"
        )


def _normalize_datetime(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _to_report_timezone(dt: datetime) -> datetime:
    return _normalize_datetime(dt).astimezone(REPORT_TIMEZONE)


def _format_day_label(dt: datetime) -> str:
    return f"{GERMAN_WEEKDAYS[dt.weekday()]} {dt:%Y-%m-%d}"


def _resolve_report_time_bounds(event: PublicEventSettings, orders: list[OrderWithFees]) -> tuple[datetime, datetime]:
    if orders:
        fallback_from = _normalize_datetime(orders[0].booked_at)
        fallback_to = _normalize_datetime(orders[-1].booked_at)
    else:
        fallback_from = event.start_date or event.end_date or datetime.now(tz=timezone.utc)
        fallback_to = event.end_date or event.start_date or fallback_from

    return _normalize_datetime(event.start_date or fallback_from), _normalize_datetime(event.end_date or fallback_to)


def _report_day_start(local_dt: datetime, daily_end_time: time | None) -> datetime:
    day_start = local_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    if daily_end_time is None:
        return day_start

    boundary = day_start.replace(
        hour=daily_end_time.hour,
        minute=daily_end_time.minute,
        second=daily_end_time.second,
    )
    if local_dt < boundary:
        return boundary - timedelta(days=1)
    return boundary


def _build_report_line_items(line_items: list[LineItem]) -> list[ReportLineItem]:
    return [
        ReportLineItem(
            quantity=item.quantity,
            product_name=item.product.name,
            unit_price=item.product_price,
            total_price=item.total_price,
        )
        for item in line_items
    ]


def _build_order_groups(orders: list[OrderWithFees], daily_end_time: time | None) -> list[ReportDayGroup]:
    groups: dict[datetime, ReportDayGroup] = {}
    for order in orders:
        local_booked_at = _to_report_timezone(order.booked_at)
        day_start = _report_day_start(local_booked_at, daily_end_time)
        if day_start not in groups:
            groups[day_start] = ReportDayGroup(
                date_label=_format_day_label(day_start),
                day_total=0.0,
                orders=[],
            )

        groups[day_start].orders.append(
            ReportOrderEntry(
                time_label=local_booked_at.strftime("%H:%M"),
                transaction_id=f"{order.id:010}",
                customer_tag_uid_hex=order.customer_tag_uid_hex,
                total_price=order.total_price,
                line_items=_build_report_line_items(order.line_items),
            )
        )
        groups[day_start].day_total += order.total_price

    return [groups[day_start] for day_start in sorted(groups)]


def _build_summary(daily_revenue: list[DailyRevenue], orders: list[OrderWithFees], total: float) -> ReportSummary:
    order_count = len(orders)
    average_order_value = total / order_count if order_count else 0.0
    day_count = len(daily_revenue)
    average_day_revenue = total / day_count if day_count else 0.0
    top_day = max(daily_revenue, key=lambda day: day.revenue, default=None)

    return ReportSummary(
        order_count=order_count,
        average_order_value=average_order_value,
        average_day_revenue=average_day_revenue,
        top_day_label=top_day.day if top_day is not None else "Keine Umsaetze",
        top_day_revenue=top_day.revenue if top_day is not None else 0.0,
    )


def _build_report_context(
    *,
    node: Node,
    orders: list[OrderWithFees],
    daily_revenue: list[DailyRevenue],
    from_time: datetime,
    to_time: datetime,
    total: float,
    fees: float,
    config: BonConfig,
    currency_symbol: str,
    daily_end_time: time | None,
) -> NodeReportContext:
    fees_of_total = total * fees
    return NodeReportContext(
        node=node,
        orders=orders,
        currency_symbol=currency_symbol,
        config=config,
        daily_revenue_stats=daily_revenue,
        summary=_build_summary(daily_revenue=daily_revenue, orders=orders, total=total),
        order_groups=_build_order_groups(orders=orders, daily_end_time=daily_end_time),
        from_time=from_time,
        to_time=to_time,
        total_revenue=total,
        fees=fees_of_total,
        fees_percent=fees,
        revenue_minus_fees=total - fees_of_total,
    )


async def generate_report(conn: Connection, node_id: int, fees=0.0) -> PdfRenderResult:
    node = await fetch_node(conn=conn, node_id=node_id)
    assert node is not None
    event = await fetch_event_for_node(conn=conn, node=node)

    all_orders = await conn.fetch_many(
        OrderWithFees,
        "select o.*, o.total_price * $2 as fees, o.total_price - o.total_price * $2 as total_price_minus_fees "
        "from orders_at_node_and_children($1) o "
        "where o.payment_method = 'tag' and o.order_type = 'sale' "
        "order by o.booked_at",
        node_id,
        fees,
    )
    from_time, to_time = _resolve_report_time_bounds(event, all_orders)
    from_time_local = from_time.astimezone(REPORT_TIMEZONE)
    to_time_local = to_time.astimezone(REPORT_TIMEZONE)

    orders = [order for order in all_orders if from_time <= _normalize_datetime(order.booked_at) <= to_time]

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)
    query = TimeseriesStatsQuery(from_time=from_time, to_time=to_time)
    hourly_revenue_stats = await get_hourly_sales_stats(
        conn=conn, node=node, query=query, from_time=from_time, to_time=to_time
    )
    revenue_stats = await get_daily_stats(hourly_stats=hourly_revenue_stats, event=event)

    daily_revenue = []
    total = 0.0
    for stats in revenue_stats.intervals:
        interval_from = _normalize_datetime(stats.from_time)
        interval_to = _normalize_datetime(stats.to_time)
        if interval_to <= from_time or interval_from >= to_time:
            continue

        interval_local = interval_from.astimezone(REPORT_TIMEZONE)
        daily_fees = stats.revenue * fees
        day_name = _format_day_label(interval_local)
        daily_revenue.append(
            DailyRevenue(
                day=day_name,
                revenue=stats.revenue,
                fees=daily_fees,
                revenue_minus_fees=stats.revenue - daily_fees,
            )
        )
        total += stats.revenue

    _check_order_revenue_consistency(hourly_revenue_stats, orders, total)

    context = _build_report_context(
        node=node,
        orders=orders,
        from_time=from_time_local,
        to_time=to_time_local,
        total=total,
        fees=fees,
        config=config,
        currency_symbol=get_currency_symbol(event.currency_identifier),
        daily_revenue=daily_revenue,
        daily_end_time=event.daily_end_time,
    )
    return await render_report(context=context)
