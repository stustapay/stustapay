# pylint: disable=redefined-outer-name
from datetime import UTC, datetime, time

from sftkit.database import Connection

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod, get_source_account, get_target_account
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.tree import Node
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.booking import BookingIdentifier, NewLineItem, book_order
from stustapay.core.service.order.stats import TimeseriesStatsQuery, get_daily_stats, get_hourly_sales_stats
from stustapay.core.service.product import ProductService
from stustapay.core.service.tree.common import fetch_event_for_node

from .conftest import Cashier, CreateRandomUserTag


async def _create_customer_account(
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
) -> int:
    from stustapay.core.service.user_tag import get_or_assign_user_tag

    customer_tag = await create_random_user_tag()
    user_tag_id = await get_or_assign_user_tag(
        conn=db_connection,
        node=event_node,
        uid=customer_tag.uid,
        pin=customer_tag.pin,
    )

    return await db_connection.fetchval(
        """
        insert into account (node_id, type, name, user_tag_id, balance)
        values ($1, 'private', 'Stats Test Customer', $2, $3)
        returning id
        """,
        event_node.event_node_id,
        user_tag_id,
        100.0,
    )


async def _create_sale_order(
    db_connection: Connection,
    event_node: Node,
    cashier: Cashier,
    till_id: int,
    customer_account_id: int,
    product: Product,
    quantity: int,
    booked_at: datetime,
) -> int:
    sale_exit_acc = await get_system_account_for_node(
        conn=db_connection,
        node=event_node,
        account_type=AccountType.sale_exit,
    )

    booking = await book_order(
        conn=db_connection,
        order_type=OrderType.sale,
        payment_method=PaymentMethod.tag,
        cashier_id=cashier.id,
        till_id=till_id,
        line_items=[
            NewLineItem(
                quantity=quantity,
                product_id=product.id,
                product_price=product.price,
                tax_rate_id=product.tax_rate_id,
            )
        ],
        bookings={
            BookingIdentifier(
                source_account_id=get_source_account(OrderType.sale, customer_account_id),
                target_account_id=get_target_account(OrderType.sale, product, sale_exit_acc.id),
            ): (product.price or 0) * quantity
        },
        customer_account_id=customer_account_id,
    )
    await db_connection.execute("update ordr set booked_at = $2 where id = $1", booking.id, booked_at)
    return booking.id


async def _set_event_time_range(
    db_connection: Connection,
    event_node: Node,
    *,
    start_date: datetime,
    end_date: datetime,
    daily_end_time: time,
) -> None:
    await db_connection.execute(
        "update event "
        "set start_date = $2, end_date = $3, daily_end_time = $4 "
        "where id = (select event_id from node where id = $1)",
        event_node.id,
        start_date,
        end_date,
        daily_end_time,
    )


async def _set_cancel_order_booked_at(db_connection: Connection, original_order_id: int, booked_at: datetime) -> None:
    await db_connection.execute(
        "update ordr set booked_at = $2 where cancels_order = $1",
        original_order_id,
        booked_at,
    )


async def test_get_product_stats_returns_hourly_and_overall_breakdowns(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Stats Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    deposit = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Deposit Product",
            price=2.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=True,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=1,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )
    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
    )
    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=deposit,
        quantity=1,
        booked_at=datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
    )

    stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
        ),
    )

    assert len(stats.product_hourly_intervals) == 1
    assert len(stats.deposit_hourly_intervals) == 1

    product_hourly = stats.product_hourly_intervals[0]
    assert product_hourly.product_name == "Stats Product"
    assert [(interval.from_time.hour, interval.count, interval.revenue) for interval in product_hourly.intervals] == [
        (10, 1, 5.0),
        (11, 2, 10.0),
    ]

    deposit_hourly = stats.deposit_hourly_intervals[0]
    assert deposit_hourly.product_name == "Deposit Product"
    assert [(interval.from_time.hour, interval.count, interval.revenue) for interval in deposit_hourly.intervals] == [
        (11, 1, 2.0)
    ]

    assert [(row.product_name, row.count, row.revenue) for row in stats.product_overall_stats] == [
        ("Stats Product", 3, 15.0)
    ]
    assert [(row.product_name, row.count, row.revenue) for row in stats.deposit_overall_stats] == [
        ("Deposit Product", 1, 2.0)
    ]


async def test_sales_stats_and_product_breakdowns_exclude_cancelled_sales(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Stats Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )
    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=order_id)
    await _set_cancel_order_booked_at(
        db_connection,
        original_order_id=order_id,
        booked_at=datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
    )

    query = TimeseriesStatsQuery(
        from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
    )
    event = await fetch_event_for_node(conn=db_connection, node=event_node)
    assert query.from_time is not None
    assert query.to_time is not None
    hourly_sales_stats = await get_hourly_sales_stats(
        conn=db_connection,
        node=event_node,
        query=query,
        from_time=query.from_time,
        to_time=query.to_time,
    )
    daily_sales_stats = await get_daily_stats(hourly_stats=hourly_sales_stats, event=event)
    product_stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=query,
    )

    assert hourly_sales_stats.intervals == []
    assert len(daily_sales_stats.intervals) == 1
    assert daily_sales_stats.intervals[0].count == 0
    assert daily_sales_stats.intervals[0].revenue == 0.0
    assert product_stats.hourly_intervals == []
    assert len(product_stats.daily_intervals) == 1
    assert product_stats.daily_intervals[0].count == 0
    assert product_stats.daily_intervals[0].revenue == 0.0
    assert product_stats.product_hourly_intervals == []
    assert product_stats.product_overall_stats == []
    assert product_stats.deposit_hourly_intervals == []
    assert product_stats.deposit_overall_stats == []

    all_dates_stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(from_time=None, to_time=None),
    )
    assert all_dates_stats.product_hourly_intervals == []
    assert all_dates_stats.product_overall_stats == []
    assert all_dates_stats.deposit_hourly_intervals == []
    assert all_dates_stats.deposit_overall_stats == []


async def test_product_breakdowns_exclude_cancellation_when_original_sale_precedes_range(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Cancelled Before Range Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)
    order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )
    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=order_id)
    await _set_cancel_order_booked_at(
        db_connection,
        original_order_id=order_id,
        booked_at=datetime(2026, 1, 2, 10, 0, tzinfo=UTC),
    )

    product_stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 2, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        ),
    )

    assert product_stats.product_hourly_intervals == []
    assert product_stats.product_overall_stats == []
    assert product_stats.deposit_hourly_intervals == []
    assert product_stats.deposit_overall_stats == []


async def test_get_revenue_by_counter_excludes_cancelled_sales(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Cancelled Stats Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )

    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=order_id)

    stats = await order_service.stats.get_revenue_by_counter(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
        ),
    )

    assert stats.counters == []
    assert stats.total_revenue == 0.0


async def test_dashboard_overview_excludes_cancelled_sales_from_guest_count(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Dashboard Stats Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )
    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=order_id)

    overview = await order_service.stats.get_dashboard_overview(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
        ),
    )

    assert overview.total_revenue == 0.0
    assert overview.guests_with_orders == 0


async def test_revenue_stats_apply_expected_cancellation_scope(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Net Revenue Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=3,
        booked_at=datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
    )
    cancelled_order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
    )
    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=cancelled_order_id)
    await _set_cancel_order_booked_at(
        db_connection,
        cancelled_order_id,
        datetime(2026, 1, 1, 12, 0, tzinfo=UTC),
    )

    query = TimeseriesStatsQuery(
        from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
    )
    overview = await order_service.stats.get_dashboard_overview(
        token=event_admin_token,
        node_id=event_node.id,
        query=query,
    )
    product_stats = await order_service.stats.get_product_stats(
        token=event_admin_token,
        node_id=event_node.id,
        query=query,
    )
    counter_stats = await order_service.stats.get_revenue_by_counter(
        token=event_admin_token,
        node_id=event_node.id,
        query=query,
    )

    product_revenue_total = sum(row.revenue for row in product_stats.product_overall_stats) + sum(
        row.revenue for row in product_stats.deposit_overall_stats
    )

    assert overview.total_revenue == 5.0
    assert [(interval.from_time.hour, interval.count, interval.revenue) for interval in product_stats.hourly_intervals] == [
        (10, 3, 15.0)
    ]
    assert len(product_stats.daily_intervals) == 1
    assert product_stats.daily_intervals[0].count == 3
    assert product_stats.daily_intervals[0].revenue == 15.0
    assert product_revenue_total == 15.0
    assert counter_stats.total_revenue == 5.0


async def test_dashboard_overview_counts_only_guests_fully_paid_out(
    db_connection: Connection,
    order_service: OrderService,
    event_node: Node,
    event_admin_token: str,
    event_admin_user,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    fully_paid_out_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)
    partially_paid_out_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)
    cash_exit_account = await get_system_account_for_node(
        conn=db_connection,
        node=event_node,
        account_type=AccountType.cash_exit,
    )

    booked_at = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)

    await db_connection.execute(
        "insert into transaction (source_account, target_account, conducting_user_id, booked_at, amount, vouchers) "
        "values ($1, $2, $3, $4, $5, 0)",
        fully_paid_out_account_id,
        cash_exit_account.id,
        event_admin_user[0].id,
        booked_at,
        100.0,
    )
    await db_connection.execute("update account set balance = 0 where id = $1", fully_paid_out_account_id)

    await db_connection.execute(
        "insert into transaction (source_account, target_account, conducting_user_id, booked_at, amount, vouchers) "
        "values ($1, $2, $3, $4, $5, 0)",
        partially_paid_out_account_id,
        cash_exit_account.id,
        event_admin_user[0].id,
        booked_at,
        20.0,
    )
    await db_connection.execute("update account set balance = 80 where id = $1", partially_paid_out_account_id)

    overview = await order_service.stats.get_dashboard_overview(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
        ),
    )

    assert overview.guests_paid_out == 1


async def test_dashboard_overview_counts_guests_who_spent_their_balance_to_zero(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        end_date=datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        daily_end_time=time(0, 0),
    )

    fully_spent_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Spend To Zero Product",
            price=100.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    partially_spent_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Spend Partially Product",
            price=20.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    fully_spent_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)
    partially_spent_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=fully_spent_account_id,
        product=fully_spent_product,
        quantity=1,
        booked_at=datetime(2026, 1, 1, 13, 0, tzinfo=UTC),
    )
    await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=partially_spent_account_id,
        product=partially_spent_product,
        quantity=1,
        booked_at=datetime(2026, 1, 1, 14, 0, tzinfo=UTC),
    )

    overview = await order_service.stats.get_dashboard_overview(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            to_time=datetime(2026, 1, 1, 23, 59, tzinfo=UTC),
        ),
    )

    assert overview.guests_paid_out == 1


async def test_revenue_prediction_excludes_cancelled_sales(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag,
):
    now = datetime.now(tz=UTC)
    await _set_event_time_range(
        db_connection,
        event_node,
        start_date=now.replace(hour=0, minute=0, second=0, microsecond=0),
        end_date=now.replace(hour=23, minute=59, second=59, microsecond=0),
        daily_end_time=time(0, 0),
    )

    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Prediction Stats Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_id = await _create_sale_order(
        db_connection=db_connection,
        event_node=event_node,
        cashier=cashier,
        till_id=till.id,
        customer_account_id=customer_account_id,
        product=product,
        quantity=2,
        booked_at=now.replace(minute=0, second=0, microsecond=0),
    )
    await order_service.cancel_sale_admin(token=event_admin_token, node_id=event_node.id, order_id=order_id)

    prediction = await order_service.stats.get_revenue_prediction(
        token=event_admin_token,
        node_id=event_node.id,
        query=TimeseriesStatsQuery(
            from_time=now.replace(hour=0, minute=0, second=0, microsecond=0),
            to_time=now.replace(hour=23, minute=59, second=59, microsecond=0),
        ),
    )

    assert prediction.current_revenue == 0.0
    assert prediction.actual_visitors_today == 0
    assert prediction.historical_revenue_per_visitor is None
    assert prediction.visitor_based_prediction is None
