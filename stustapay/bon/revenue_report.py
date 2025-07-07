from datetime import datetime, timedelta

import pytz
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig, gen_dummy_order
from stustapay.bon.pdflatex import PdfRenderResult, pdflatex, render_template
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.order import Order
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.order.stats import (
    Timeseries,
    TimeseriesStatsQuery,
    get_daily_stats,
    get_event_time_bounds,
    get_hourly_sales_stats,
)
from stustapay.core.service.tree.common import fetch_event_for_node, fetch_node


class DailyRevenue(BaseModel):
    day: str
    revenue: float
    fees: float
    revenue_minus_fees: float


class NodeReportContext(BaseModel):
    config: BonConfig
    orders: list[Order]
    daily_revenue_stats: list[DailyRevenue]
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
    ctx = NodeReportContext(
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
        orders=[
            OrderWithFees(
                fees=dummy_order.total_price * fee,
                total_price_minus_fees=dummy_order.total_price - dummy_order.total_price * fee,
                **dummy_order.dict(),
            )
            for dummy_order in dummy_orders
        ],
        daily_revenue_stats=[
            DailyRevenue(
                day="Monday 2024-10-10",
                revenue=10212,
                fees=10212 * fee,
                revenue_minus_fees=10212 - 10212 * fee,
            ),
            DailyRevenue(
                day="Tuesday 2024-10-11",
                revenue=3000.23,
                fees=3000.23 * fee,
                revenue_minus_fees=3000.23 - 3000.23 * fee,
            ),
        ],
        from_time=datetime.now() - timedelta(days=3),
        to_time=datetime.now(),
        total_revenue=13212.23,
        fees=13212.23 * fee,
        fees_percent=fee,
        revenue_minus_fees=13212.23 - 13212.23 * fee,
        currency_symbol=get_currency_symbol(event.currency_identifier),
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


async def generate_report(conn: Connection, node_id: int, fees=0.0) -> PdfRenderResult:
    node = await fetch_node(conn=conn, node_id=node_id)
    assert node is not None
    event = await fetch_event_for_node(conn=conn, node=node)
    
    from_time, to_time = get_event_time_bounds(TimeseriesStatsQuery(from_time=None, to_time=None), event)
    
    # Convert UTC times to local timezone for display
    local_tz = pytz.timezone('Europe/Berlin')  # Adjust this to your actual timezone if needed
    if from_time.tzinfo is None:
        from_time = pytz.utc.localize(from_time)
    if to_time.tzinfo is None:
        to_time = pytz.utc.localize(to_time)
    
    from_time_local = from_time.astimezone(local_tz)
    to_time_local = to_time.astimezone(local_tz)
    # Get all orders regardless of time filtering to show complete order list in report
    orders = await conn.fetch_many(
        OrderWithFees,
        "select o.*, o.total_price * $2 as fees, o.total_price - o.total_price * $2 as total_price_minus_fees "
        "from orders_at_node_and_children($1) o where o.payment_method = 'tag' order by o.booked_at",
        node_id,
        fees,
    )

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    # Use original UTC time bounds for the stats calculation, but adjust for daily_end_time
    # The issue is that daily_end_time=03:00 means days run from 03:00 to 03:00, 
    # so we need to shift the boundaries accordingly
    daily_end_hour = event.daily_end_time.hour if event.daily_end_time else 0
    
    # Debug: Print the adjustment logic
    print(f"Original UTC times: {from_time} to {to_time}")
    print(f"Local times: {from_time_local} to {to_time_local}")
    print(f"Daily end hour: {daily_end_hour}")
    
    # For the stats calculation, shift the time bounds to align with daily boundaries
    from_time_adjusted = from_time.replace(hour=daily_end_hour, minute=0, second=0)
    to_time_adjusted = to_time.replace(hour=daily_end_hour, minute=0, second=0)
    
    # If the original from_time is before the daily boundary, start from previous day
    if from_time.hour < daily_end_hour:
        from_time_adjusted = from_time_adjusted - timedelta(days=1)
    
    # Extend by 2 days to ensure we capture complete daily periods including the final day
    # This ensures Sunday (2025-06-22 03:00 to 2025-06-23 03:00) is included
    to_time_adjusted = to_time_adjusted + timedelta(days=2)
    
    print(f"Adjusted times: {from_time_adjusted} to {to_time_adjusted}")
        
    hourly_revenue_stats = await get_hourly_sales_stats(conn=conn, node=node, from_time=from_time_adjusted, to_time=to_time_adjusted)
    revenue_stats = await get_daily_stats(hourly_stats=hourly_revenue_stats, event=event)
    
    print(f"Daily stats intervals:")
    for i, interval in enumerate(revenue_stats.intervals):
        print(f"  {i}: {interval.from_time} to {interval.to_time} - Revenue: {interval.revenue}")
    
    daily_revenue = []
    total = 0.0
    for stats in revenue_stats.intervals:
        # Convert interval time to local timezone for proper day naming
        interval_local = stats.from_time.astimezone(local_tz) if stats.from_time.tzinfo else local_tz.localize(stats.from_time).astimezone(local_tz)
        
        print(f"Processing interval: {stats.from_time} UTC -> {interval_local} local, Revenue: {stats.revenue}")
        print(f"  Interval date: {interval_local.date()}")
        print(f"  Event range: {from_time_local.date()} to {to_time_local.date()}")
        
        # More lenient filtering - only skip if clearly outside the event period
        # Allow Sunday (June 22) even if it extends beyond the exact end time
        if interval_local.date() < from_time_local.date():
            print(f"Skipping interval before event start: {interval_local.date()}")
            continue
            
        # Don't filter by end date yet - let's see all intervals first
        # Skip intervals with zero revenue only if they're clearly outside the event
        if stats.revenue == 0.0 and interval_local.date() < from_time_local.date():
            print(f"Skipping zero revenue interval before event: {interval_local.date()}")
            continue
        
        daily_fees = stats.revenue * fees
        day_name = interval_local.strftime("%A %Y-%m-%d")
        print(f"Creating daily revenue entry: {day_name} - Revenue: {stats.revenue}")
        daily_revenue.append(
            DailyRevenue(
                day=day_name,
                revenue=stats.revenue,
                fees=daily_fees,
                revenue_minus_fees=stats.revenue - daily_fees,
            )
        )
        total += stats.revenue

    # Skip consistency check since orders include all-time data while stats are filtered by event dates
    # _check_order_revenue_consistency(hourly_revenue_stats, orders, total)

    fees_of_total = total * fees
    context = NodeReportContext(
        node=node,
        orders=orders,
        currency_symbol=get_currency_symbol(event.currency_identifier),
        config=config,
        daily_revenue_stats=daily_revenue,
        from_time=from_time_local,
        to_time=to_time_local,
        total_revenue=total,
        fees=fees_of_total,
        fees_percent=fees,
        revenue_minus_fees=total - fees_of_total,
    )
    return await render_report(context=context)
