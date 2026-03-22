# pylint: disable=redefined-outer-name
from datetime import UTC, datetime, time

from sftkit.database import Connection

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.tree import Node
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.booking import BookingIdentifier, NewLineItem, book_order
from stustapay.core.service.order.order import get_source_account, get_target_account
from stustapay.core.service.order.stats import TimeseriesStatsQuery
from stustapay.core.service.product import ProductService

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
            ): product.price * quantity
        },
        customer_account_id=customer_account_id,
    )
    await db_connection.execute("update ordr set booked_at = $2 where id = $1", booking.id, booked_at)
    return booking.id


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
    await db_connection.execute(
        "update event "
        "set start_date = $2, end_date = $3, daily_end_time = $4 "
        "where id = (select event_id from node where id = $1)",
        event_node.id,
        datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        datetime(2026, 1, 2, 23, 59, tzinfo=UTC),
        time(0, 0),
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
