# pylint: disable=redefined-outer-name
import secrets
from datetime import UTC, datetime

import pytest
from sftkit.database import Connection
from sftkit.error import AccessDenied

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUser, NewUserRole, NewUserToRoles, Privilege
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.account import AccountService
from stustapay.core.service.order import OrderService
from stustapay.core.service.order.booking import BookingIdentifier, NewLineItem, book_order
from stustapay.core.service.order.order import get_source_account, get_target_account
from stustapay.core.service.product import ProductService
from stustapay.core.service.user import UserService

from .conftest import Cashier, CreateRandomUserTag


async def _create_event_token_with_privileges(
    *,
    create_random_user_tag: CreateRandomUserTag,
    event_node: Node,
    global_admin_token: str,
    privileges: list[Privilege],
    user_service: UserService,
) -> str:
    user_tag = await create_random_user_tag()
    role = await user_service.create_user_role(
        token=global_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"order-service-test-role-{secrets.token_hex(8)}",
            is_privileged=False,
            privileges=privileges,
        ),
    )
    user = await user_service.create_user(
        node_id=event_node.id,
        token=global_admin_token,
        new_user=NewUser(
            login=f"order-service-user-{secrets.token_hex(8)}",
            description="",
            display_name="Order Service Test User",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
        password="rolf",
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=user.id, role_ids=[role.id]),
    )
    login_result = await user_service.login_user(username=user.login, password="rolf")
    assert login_result.success is not None
    return login_result.success.token


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
        "select count(*) from ordr where order_type = $1 and customer_account_id = $2",
        OrderType.money_transfer.name,
        source_account_id,
    )
    assert money_transfer_count == 1
    assert all(order.order_type != OrderType.money_transfer for order in filtered_orders)


async def test_can_book_orders_can_read_orders_in_admin_context(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    global_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag: CreateRandomUserTag,
    user_service: UserService,
):
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Privilege Read Product",
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
    )
    can_book_orders_token = await _create_event_token_with_privileges(
        create_random_user_tag=create_random_user_tag,
        event_node=event_node,
        global_admin_token=global_admin_token,
        privileges=[Privilege.can_book_orders],
        user_service=user_service,
    )

    filtered_orders = await order_service.list_orders_filtered(token=can_book_orders_token, node_id=event_node.id)
    customer_orders = await order_service.list_orders(
        token=can_book_orders_token,
        node_id=event_node.id,
        customer_account_id=customer_account_id,
    )
    till_orders = await order_service.list_orders_by_till(
        token=can_book_orders_token,
        node_id=event_node.id,
        till_id=till.id,
    )
    order = await order_service.get_order(
        token=can_book_orders_token,
        node_id=event_node.id,
        order_id=order_id,
    )

    assert [entry.id for entry in filtered_orders] == [order_id]
    assert [entry.id for entry in customer_orders] == [order_id]
    assert [entry.id for entry in till_orders] == [order_id]
    assert order is not None
    assert order.id == order_id


async def test_order_admin_reads_require_node_administration_or_can_book_orders(
    db_connection: Connection,
    order_service: OrderService,
    product_service: ProductService,
    event_node: Node,
    event_admin_token: str,
    global_admin_token: str,
    tax_rate_ust: TaxRate,
    cashier: Cashier,
    till,
    create_random_user_tag: CreateRandomUserTag,
    user_service: UserService,
):
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Privilege Deny Product",
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
    )
    no_order_privilege_token = await _create_event_token_with_privileges(
        create_random_user_tag=create_random_user_tag,
        event_node=event_node,
        global_admin_token=global_admin_token,
        privileges=[Privilege.customer_management],
        user_service=user_service,
    )

    with pytest.raises(AccessDenied):
        await order_service.list_orders_filtered(token=no_order_privilege_token, node_id=event_node.id)

    with pytest.raises(AccessDenied):
        await order_service.list_orders(
            token=no_order_privilege_token,
            node_id=event_node.id,
            customer_account_id=customer_account_id,
        )

    with pytest.raises(AccessDenied):
        await order_service.list_orders_by_till(
            token=no_order_privilege_token,
            node_id=event_node.id,
            till_id=till.id,
        )

    with pytest.raises(AccessDenied):
        await order_service.get_order(
            token=no_order_privilege_token,
            node_id=event_node.id,
            order_id=order_id,
        )
