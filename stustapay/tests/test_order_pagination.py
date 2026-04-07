# pylint: disable=redefined-outer-name
from datetime import UTC, datetime
from sftkit.database import Connection

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.tree import Node
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.account import AccountService
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.booking import BookingIdentifier, NewLineItem, book_order
from stustapay.core.service.order.order import get_source_account, get_target_account
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
        values ($1, 'private', 'Pagination Test Customer', $2, $3)
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
              quantity=1,
              product_id=product.id,
              product_price=product.price,
              tax_rate_id=product.tax_rate_id,
          )
        ],
        bookings={
          BookingIdentifier(
              source_account_id=get_source_account(OrderType.sale, customer_account_id),
              target_account_id=get_target_account(OrderType.sale, product, sale_exit_acc.id),
          ): product.price
        },
        customer_account_id=customer_account_id,
    )

    return booking.id


async def test_list_orders_filtered_paginates_with_stable_ordering(
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
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Pagination Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_ids = [
        await _create_sale_order(
            db_connection=db_connection,
            event_node=event_node,
            cashier=cashier,
            till_id=till.id,
            customer_account_id=customer_account_id,
            product=product,
        )
        for _ in range(4)
    ]

    timestamps = [
        datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
        datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
        datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
        datetime(2026, 1, 1, 12, 0, tzinfo=UTC),
    ]
    for order_id, booked_at in zip(order_ids, timestamps, strict=True):
        await db_connection.execute("update ordr set booked_at = $2 where id = $1", order_id, booked_at)

    first_page = await order_service.list_orders_filtered(
        token=event_admin_token,
        node_id=event_node.id,
        limit=2,
        offset=0,
    )
    second_page = await order_service.list_orders_filtered(
        token=event_admin_token,
        node_id=event_node.id,
        limit=2,
        offset=2,
    )

    assert [order.id for order in first_page] == [order_ids[3], order_ids[2]]
    assert [order.id for order in second_page] == [order_ids[1], order_ids[0]]
    assert set(order.id for order in first_page).isdisjoint(order.id for order in second_page)


async def test_list_orders_filtered_can_filter_by_selected_dates(
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
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Selected Dates Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_ids = [
        await _create_sale_order(
            db_connection=db_connection,
            event_node=event_node,
            cashier=cashier,
            till_id=till.id,
            customer_account_id=customer_account_id,
            product=product,
        )
        for _ in range(4)
    ]

    timestamps = [
        datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
        datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
        datetime(2026, 1, 2, 10, 0, tzinfo=UTC),
        datetime(2026, 1, 2, 11, 0, tzinfo=UTC),
    ]
    for order_id, booked_at in zip(order_ids, timestamps, strict=True):
        await db_connection.execute("update ordr set booked_at = $2 where id = $1", order_id, booked_at)

    filtered_orders = await order_service.list_orders_filtered(
        token=event_admin_token,
        node_id=event_node.id,
        selected_dates=["2026-01-02"],
    )

    assert [order.id for order in filtered_orders] == [order_ids[3], order_ids[2]]


async def test_list_orders_filtered_accepts_comma_separated_selected_dates(
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
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Comma Selected Dates Product",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            fixed_price=True,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
        ),
    )
    customer_account_id = await _create_customer_account(db_connection, event_node, create_random_user_tag)

    order_ids = [
        await _create_sale_order(
            db_connection=db_connection,
            event_node=event_node,
            cashier=cashier,
            till_id=till.id,
            customer_account_id=customer_account_id,
            product=product,
        )
        for _ in range(4)
    ]

    timestamps = [
        datetime(2026, 1, 1, 10, 0, tzinfo=UTC),
        datetime(2026, 1, 1, 11, 0, tzinfo=UTC),
        datetime(2026, 1, 2, 10, 0, tzinfo=UTC),
        datetime(2026, 1, 2, 11, 0, tzinfo=UTC),
    ]
    for order_id, booked_at in zip(order_ids, timestamps, strict=True):
        await db_connection.execute("update ordr set booked_at = $2 where id = $1", order_id, booked_at)

    filtered_orders = await order_service.list_orders_filtered(
        token=event_admin_token,
        node_id=event_node.id,
        selected_dates=["2026-01-01,2026-01-02"],
    )

    assert [order.id for order in filtered_orders] == [order_ids[3], order_ids[2], order_ids[1], order_ids[0]]


async def test_list_orders_filtered_excludes_money_transfers(
    account_service: AccountService,
    order_service: OrderService,
    event_admin_token: str,
    db_connection: Connection,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    source_tag = await create_random_user_tag()
    target_tag = await create_random_user_tag()

    source_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'source-account', 10.00) returning id",
        event_node.id,
        source_tag.id,
    )
    target_account_id = await db_connection.fetchval(
        "insert into account(node_id, user_tag_id, type, name, balance) "
        "values ($1, $2, 'private', 'target-account', 0.00) returning id",
        event_node.id,
        target_tag.id,
    )

    await account_service.transfer_account_balance(
        token=event_admin_token,
        node_id=event_node.id,
        source_account_id=source_account_id,
        target_account_id=target_account_id,
        amount=2.25,
    )

    filtered_orders = await order_service.list_orders_filtered(
        token=event_admin_token,
        node_id=event_node.id,
    )

    money_transfer_count = await db_connection.fetchval(
        "select count(*) from ordr where order_type = $1",
        OrderType.money_transfer.name,
    )
    assert money_transfer_count == 1
    assert all(order.order_type != OrderType.money_transfer for order in filtered_orders)
