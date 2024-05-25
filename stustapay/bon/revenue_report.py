from datetime import datetime, timedelta

from pydantic import BaseModel

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
from stustapay.framework.database import Connection


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


async def generate_report(conn: Connection, node_id: int, fees=0.01) -> PdfRenderResult:
    node = await fetch_node(conn=conn, node_id=node_id)
    assert node is not None
    event = await fetch_event_for_node(conn=conn, node=node)
    from_time, to_time = get_event_time_bounds(TimeseriesStatsQuery(from_time=None, to_time=None), event)
    orders = await conn.fetch_many(
        OrderWithFees,
        "select o.*, o.total_price * $2 as fees, o.total_price - o.total_price * $2 as total_price_minus_fees "
        "from orders_at_node_and_children($1) o where o.payment_method = 'tag'",
        node_id,
        fees,
    )

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    hourly_revenue_stats = await get_hourly_sales_stats(conn=conn, node=node, from_time=from_time, to_time=to_time)
    revenue_stats = await get_daily_stats(hourly_stats=hourly_revenue_stats, event=event)
    daily_revenue = []
    total = 0.0
    for stats in revenue_stats.intervals:
        daily_fees = stats.revenue * fees
        daily_revenue.append(
            DailyRevenue(
                day=stats.from_time.strftime("%A %Y-%m-%d"),
                revenue=stats.revenue,
                fees=daily_fees,
                revenue_minus_fees=stats.revenue - daily_fees,
            )
        )
        total += stats.revenue

    _check_order_revenue_consistency(hourly_revenue_stats, orders, total)

    fees_of_total = total * fees
    context = NodeReportContext(
        node=node,
        orders=orders,
        currency_symbol=get_currency_symbol(event.currency_identifier),
        config=config,
        daily_revenue_stats=daily_revenue,
        from_time=from_time,
        to_time=to_time,
        total_revenue=total,
        fees=fees_of_total,
        fees_percent=fees,
        revenue_minus_fees=total - fees_of_total,
    )
    return await render_report(context=context)
