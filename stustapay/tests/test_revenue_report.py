from datetime import datetime, time, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from stustapay.bon.pdflatex import PdfRenderResult
from stustapay.bon.revenue_report import OrderWithFees, generate_report
from stustapay.core.schema.order import LineItem, OrderType, PaymentMethod
from stustapay.core.schema.product import Product, ProductType
from stustapay.core.schema.tree import Node
from stustapay.core.service.order.stats import StatInterval, Timeseries


def _make_node() -> Node:
    return Node(
        id=42,
        parent=1,
        name="Bar",
        description="",
        read_only=False,
        event=None,
        path="/0/1/42",
        parent_ids=[0, 1],
        event_node_id=1,
        parents_until_event_node=[1],
        forbidden_objects_at_node=[],
        computed_forbidden_objects_at_node=[],
        forbidden_objects_in_subtree=[],
        computed_forbidden_objects_in_subtree=[],
        children=[],
    )


def _make_line_item(product_name: str, quantity: int, unit_price: float) -> LineItem:
    total_price = quantity * unit_price
    return LineItem(
        item_id=quantity,
        quantity=quantity,
        product=Product(
            node_id=42,
            id=quantity,
            name=product_name,
            price=unit_price,
            tax_rate_id=1,
            tax_name="ust",
            tax_rate=0.19,
            type=ProductType.user_defined,
            fixed_price=True,
            is_locked=False,
            is_returnable=False,
            restrictions=[],
        ),
        product_price=unit_price,
        total_tax=0.0,
        tax_rate_id=1,
        tax_name="ust",
        tax_rate=0.19,
    )


def _make_order(
    order_id: int,
    booked_at: datetime,
    total_price: float,
    *,
    customer_tag_uid: int | None = None,
    line_items: list[LineItem] | None = None,
) -> OrderWithFees:
    return OrderWithFees(
        id=order_id,
        uuid=uuid4(),
        total_price=total_price,
        total_tax=0.0,
        total_no_tax=total_price,
        cancels_order=None,
        booked_at=booked_at,
        payment_method=PaymentMethod.tag,
        order_type=OrderType.sale,
        cashier_id=None,
        till_id=7,
        cash_register_id=None,
        customer_account_id=None,
        customer_tag_uid=customer_tag_uid,
        customer_tag_id=None,
        line_items=line_items or [],
        fees=0.0,
        total_price_minus_fees=total_price,
    )


def _make_event_node(name: str = "PMP Festival 2026") -> Node:
    return Node(
        id=1,
        parent=0,
        name=name,
        description="",
        read_only=False,
        event=None,
        path="/0/1",
        parent_ids=[0],
        event_node_id=1,
        parents_until_event_node=[],
        forbidden_objects_at_node=[],
        computed_forbidden_objects_at_node=[],
        forbidden_objects_in_subtree=[],
        computed_forbidden_objects_in_subtree=[],
        children=[],
    )


async def test_generate_report_builds_summary_and_day_groups(monkeypatch):
    node = _make_node()
    event_node = _make_event_node()
    event = SimpleNamespace(
        start_date=datetime(2025, 6, 20, 0, 0, tzinfo=timezone.utc),
        end_date=datetime(2025, 6, 21, 23, 0, tzinfo=timezone.utc),
        daily_end_time=time(3, 0),
        ust_id="UST",
        bon_address="Address",
        bon_issuer="Issuer",
        bon_title="Title",
        currency_identifier="EUR",
    )
    in_range_order = _make_order(
        1,
        datetime(2025, 6, 20, 10, 0, tzinfo=timezone.utc),
        12.5,
        customer_tag_uid=0xABCD,
        line_items=[_make_line_item("Helles", 2, 5.0), _make_line_item("Pfand", 1, 2.5)],
    )
    same_report_day_order = _make_order(
        2,
        datetime(2025, 6, 20, 23, 30, tzinfo=timezone.utc),
        7.5,
    )
    out_of_range_order = _make_order(3, datetime(2025, 6, 22, 10, 0, tzinfo=timezone.utc), 99.0)

    conn = SimpleNamespace(fetch_many=AsyncMock(return_value=[in_range_order, same_report_day_order, out_of_range_order]))

    captured = {}

    async def fake_get_hourly_sales_stats(*, conn, node, query, from_time, to_time):
        captured["query"] = query
        captured["from_time"] = from_time
        captured["to_time"] = to_time
        return Timeseries(
            from_time=from_time,
            to_time=to_time,
            intervals=[
                StatInterval(
                    from_time=datetime(2025, 6, 20, 10, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 20, 11, 0, tzinfo=timezone.utc),
                    count=1,
                    revenue=12.5,
                ),
                StatInterval(
                    from_time=datetime(2025, 6, 20, 23, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 21, 0, 0, tzinfo=timezone.utc),
                    count=1,
                    revenue=7.5,
                ),
            ],
        )

    async def fake_get_daily_stats(*, hourly_stats, event):
        return Timeseries(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            intervals=[
                StatInterval(
                    from_time=datetime(2025, 6, 20, 1, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 21, 1, 0, tzinfo=timezone.utc),
                    count=2,
                    revenue=20.0,
                ),
                StatInterval(
                    from_time=datetime(2025, 6, 22, 3, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 23, 3, 0, tzinfo=timezone.utc),
                    count=0,
                    revenue=0.0,
                ),
            ],
        )

    async def fake_render_report(context):
        captured["context"] = context
        return PdfRenderResult(success=True)

    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_node", AsyncMock(side_effect=[node, event_node]))
    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_event_for_node", AsyncMock(return_value=event))
    monkeypatch.setattr("stustapay.bon.revenue_report.get_hourly_sales_stats", fake_get_hourly_sales_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.get_daily_stats", fake_get_daily_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.render_report", fake_render_report)

    result = await generate_report(conn=conn, node_id=node.id)

    assert result.success is True
    assert captured["query"].from_time == event.start_date
    assert captured["query"].to_time == datetime(2025, 6, 22, 3, 0, tzinfo=timezone.utc)
    assert [order.id for order in captured["context"].orders] == [in_range_order.id, same_report_day_order.id]
    assert captured["context"].summary.order_count == 2
    assert captured["context"].summary.average_order_value == 10.0
    assert captured["context"].summary.average_day_revenue == 20.0
    assert captured["context"].summary.top_day_label == "Freitag 2025-06-20"
    assert captured["context"].summary.top_day_revenue == 20.0
    assert captured["context"].config.title == "PMP Festival 2026"
    assert [daily.day for daily in captured["context"].daily_revenue_stats] == ["Freitag 2025-06-20"]
    assert len(captured["context"].order_groups) == 1
    assert captured["context"].order_groups[0].date_label == "Freitag 2025-06-20"
    assert captured["context"].order_groups[0].day_total == 20.0
    assert [order.transaction_id for order in captured["context"].order_groups[0].orders] == ["0000000001", "0000000002"]
    assert captured["context"].order_groups[0].orders[0].customer_tag_uid_hex == "ABCD"
    assert [item.product_name for item in captured["context"].order_groups[0].orders[0].line_items] == ["Helles", "Pfand"]
    assert "order_type = 'sale'" in conn.fetch_many.await_args.args[1]
    assert "not exists (select 1 from ordr c where c.cancels_order = o.id)" in conn.fetch_many.await_args.args[1]


async def test_generate_report_includes_sales_before_daily_cutoff(monkeypatch):
    node = _make_node()
    event_node = _make_event_node()
    event = SimpleNamespace(
        start_date=datetime(2025, 6, 20, 0, 0, tzinfo=timezone.utc),
        end_date=datetime(2025, 6, 21, 23, 0, tzinfo=timezone.utc),
        daily_end_time=time(3, 0),
        ust_id="UST",
        bon_address="Address",
        bon_issuer="Issuer",
        bon_title="Title",
        currency_identifier="EUR",
    )
    in_range_order = _make_order(1, datetime(2025, 6, 21, 22, 0, tzinfo=timezone.utc), 10.0)
    before_cutoff_order = _make_order(2, datetime(2025, 6, 22, 0, 30, tzinfo=timezone.utc), 5.0)
    after_cutoff_order = _make_order(3, datetime(2025, 6, 22, 3, 30, tzinfo=timezone.utc), 99.0)

    conn = SimpleNamespace(fetch_many=AsyncMock(return_value=[in_range_order, before_cutoff_order, after_cutoff_order]))
    captured = {}

    async def fake_get_hourly_sales_stats(*, conn, node, query, from_time, to_time):
        captured["query"] = query
        return Timeseries(
            from_time=from_time,
            to_time=to_time,
            intervals=[
                StatInterval(
                    from_time=datetime(2025, 6, 21, 22, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 21, 23, 0, tzinfo=timezone.utc),
                    count=1,
                    revenue=10.0,
                ),
                StatInterval(
                    from_time=datetime(2025, 6, 22, 0, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 22, 1, 0, tzinfo=timezone.utc),
                    count=1,
                    revenue=5.0,
                ),
            ],
        )

    async def fake_get_daily_stats(*, hourly_stats, event):
        return Timeseries(
            from_time=hourly_stats.from_time,
            to_time=hourly_stats.to_time,
            intervals=[
                StatInterval(
                    from_time=datetime(2025, 6, 21, 3, 0, tzinfo=timezone.utc),
                    to_time=datetime(2025, 6, 22, 3, 0, tzinfo=timezone.utc),
                    count=2,
                    revenue=15.0,
                )
            ],
        )

    async def fake_render_report(context):
        captured["context"] = context
        return PdfRenderResult(success=True)

    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_node", AsyncMock(side_effect=[node, event_node]))
    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_event_for_node", AsyncMock(return_value=event))
    monkeypatch.setattr("stustapay.bon.revenue_report.get_hourly_sales_stats", fake_get_hourly_sales_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.get_daily_stats", fake_get_daily_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.render_report", fake_render_report)

    result = await generate_report(conn=conn, node_id=node.id)

    assert result.success is True
    assert captured["query"].to_time == datetime(2025, 6, 22, 3, 0, tzinfo=timezone.utc)
    assert [order.id for order in captured["context"].orders] == [in_range_order.id, before_cutoff_order.id]
    assert captured["context"].summary.order_count == 2
    assert captured["context"].total_revenue == 15.0
    assert captured["context"].order_groups[0].day_total == 15.0
    assert captured["context"].config.title == "PMP Festival 2026"


async def test_generate_report_excludes_sales_after_daily_cutoff(monkeypatch):
    node = _make_node()
    event_node = _make_event_node()
    event = SimpleNamespace(
        start_date=datetime(2025, 6, 20, 0, 0, tzinfo=timezone.utc),
        end_date=datetime(2025, 6, 21, 23, 0, tzinfo=timezone.utc),
        daily_end_time=time(3, 0),
        ust_id="UST",
        bon_address="Address",
        bon_issuer="Issuer",
        bon_title="Title",
        currency_identifier="EUR",
    )
    after_cutoff_order = _make_order(1, datetime(2025, 6, 22, 3, 30, tzinfo=timezone.utc), 99.0)

    conn = SimpleNamespace(fetch_many=AsyncMock(return_value=[after_cutoff_order]))
    captured = {}

    async def fake_get_hourly_sales_stats(*, conn, node, query, from_time, to_time):
        captured["query"] = query
        return Timeseries(from_time=from_time, to_time=to_time, intervals=[])

    async def fake_get_daily_stats(*, hourly_stats, event):
        return Timeseries(from_time=hourly_stats.from_time, to_time=hourly_stats.to_time, intervals=[])

    async def fake_render_report(context):
        captured["context"] = context
        return PdfRenderResult(success=True)

    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_node", AsyncMock(side_effect=[node, event_node]))
    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_event_for_node", AsyncMock(return_value=event))
    monkeypatch.setattr("stustapay.bon.revenue_report.get_hourly_sales_stats", fake_get_hourly_sales_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.get_daily_stats", fake_get_daily_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.render_report", fake_render_report)

    result = await generate_report(conn=conn, node_id=node.id)

    assert result.success is True
    assert captured["query"].to_time == datetime(2025, 6, 22, 3, 0, tzinfo=timezone.utc)
    assert captured["context"].orders == []
    assert captured["context"].summary.order_count == 0
    assert captured["context"].total_revenue == 0.0


async def test_generate_report_renders_template_fallbacks(monkeypatch):
    node = _make_node()
    event_node = _make_event_node()
    event = SimpleNamespace(
        start_date=datetime(2025, 6, 20, 8, 0, tzinfo=timezone.utc),
        end_date=datetime(2025, 6, 21, 2, 0, tzinfo=timezone.utc),
        daily_end_time=time(3, 0),
        ust_id="",
        bon_address="Address",
        bon_issuer="Issuer",
        bon_title="Title",
        currency_identifier="EUR",
    )
    conn = SimpleNamespace(fetch_many=AsyncMock(return_value=[]))

    captured = {}

    async def fake_get_hourly_sales_stats(*, conn, node, query, from_time, to_time):
        return Timeseries(from_time=from_time, to_time=to_time, intervals=[])

    async def fake_get_daily_stats(*, hourly_stats, event):
        return Timeseries(from_time=hourly_stats.from_time, to_time=hourly_stats.to_time, intervals=[])

    async def fake_pdflatex(*, file_content: str):
        captured["tex"] = file_content
        return PdfRenderResult(success=True)

    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_node", AsyncMock(side_effect=[node, event_node]))
    monkeypatch.setattr("stustapay.bon.revenue_report.fetch_event_for_node", AsyncMock(return_value=event))
    monkeypatch.setattr("stustapay.bon.revenue_report.get_hourly_sales_stats", fake_get_hourly_sales_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.get_daily_stats", fake_get_daily_stats)
    monkeypatch.setattr("stustapay.bon.revenue_report.pdflatex", fake_pdflatex)

    result = await generate_report(conn=conn, node_id=node.id)

    assert result.success is True
    assert "PMP Festival 2026" in captured["tex"]
    assert "USt-IdNr." not in captured["tex"]
    assert "Keine Umsaetze im Zeitraum." in captured["tex"]
    assert "Keine Einzelbuchungen im Zeitraum." in captured["tex"]
    assert "Keine Umsaetze" in captured["tex"]
