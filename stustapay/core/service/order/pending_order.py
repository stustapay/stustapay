from datetime import datetime, timedelta
from uuid import UUID

from sftkit.database import Connection
from sftkit.error import InvalidArgument

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.order import (
    CompletedTicketSale,
    CompletedTopUp,
    CustomerRegistration,
    OrderType,
    PaymentMethod,
    PendingOrder,
    PendingOrderPaymentType,
    PendingOrderType,
    PendingTicketSale,
    PendingTopUp,
)
from stustapay.core.schema.product import ProductType
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.order.age_checks import find_oldest_customer
from stustapay.core.service.order.booking import (
    BookingIdentifier,
    NewLineItem,
    OrderInfo,
    book_order,
)
from stustapay.core.service.product import fetch_top_up_product
from stustapay.core.service.till.common import get_cash_register_account_id


async def fetch_maybe_pending_order(conn: Connection, uuid: UUID) -> PendingOrder | None:
    return await conn.fetch_maybe_one(
        PendingOrder, "select * from pending_sumup_order where uuid = $1 and status = 'pending'", uuid
    )


async def fetch_pending_order(conn: Connection, uuid: UUID) -> PendingOrder:
    return await conn.fetch_one(
        PendingOrder, "select * from pending_sumup_order where uuid = $1 and status = 'pending'", uuid
    )


SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)


async def fetch_pending_orders(conn: Connection) -> list[PendingOrder]:
    return await conn.fetch_many(
        PendingOrder,
        "select o.* from pending_sumup_order o "
        "where o.status = 'pending' "
        "and ((o.last_checked is null and now() > o.created_at + $1) "
        "   or now() > o.last_checked + make_interval(secs => o.check_interval))",
        SUMUP_INITIAL_CHECK_TIMEOUT,
    )


async def save_pending_ticket_sale(
    conn: Connection,
    till_id: int,
    node_id: int,
    cashier_id: int | None,
    ticket_sale: CompletedTicketSale,
    payment_type: PendingOrderPaymentType,
):
    await conn.execute(
        "insert into pending_sumup_order (uuid, node_id, till_id, cashier_id, order_type, order_content_version, order_content, payment_type) "
        "values ($1, $2, $3, $4, 'ticket', 1, $5, $6)",
        ticket_sale.uuid,
        node_id,
        till_id,
        cashier_id,
        ticket_sale.model_dump_json(),
        payment_type.value,
    )


def load_pending_ticket_sale(pending_order: PendingOrder) -> CompletedTicketSale:
    if pending_order.order_type != PendingOrderType.ticket:
        raise InvalidArgument("Invalid order type found for this uuid")
    # TODO: version check
    ticket_sale = CompletedTicketSale.model_validate_json(pending_order.order_content)
    return ticket_sale


async def make_ticket_sale_bookings(
    *,
    conn: Connection,
    current_till: Till,
    node: Node,
    current_user_id: int | None,
    ticket_sale: PendingTicketSale | CompletedTicketSale,
    booked_at: datetime,
) -> int:
    # reuse or create a new customer account for the given tag
    # store the initial topup amount as well as restriction for each newly created customer
    customers: list[CustomerRegistration] = []

    for scanned_ticket in ticket_sale.scanned_tickets:
        restriction = await conn.fetchval(
            "select restriction from user_tag where pin = $1 and node_id = any($2)",
            scanned_ticket.customer_tag_pin,
            node.ids_to_root,
        )
        # register tag uid
        user_tag_id = await conn.fetchval(
            "update user_tag set uid = $1 where pin = $2 and node_id = any($3) returning id",
            scanned_ticket.customer_tag_uid,
            scanned_ticket.customer_tag_pin,
            node.ids_to_root,
        )

        customer_account_id: int
        if scanned_ticket.account is None:
            customer_account_id = await conn.fetchval(
                "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private') on conflict (user_tag_id) do update set user_tag_id = $2 returning id",
                node.event_node_id,
                user_tag_id,
            )

        else:
            customer_account_id = await conn.fetchval(
                "update account set user_tag_id = $2 where node_id = $1 and id = $3 returning id",
                node.event_node_id,
                user_tag_id,
                scanned_ticket.account.id,
            )

        customers.append(
            CustomerRegistration(
                account_id=customer_account_id,
                restriction=restriction,
                ticket_included_top_up=scanned_ticket.ticket.initial_top_up_amount,
                top_up_amount=scanned_ticket.top_up_amount,
            )
        )

    oldest_customer_account_id = find_oldest_customer(customers)

    # TODO: allow to book PendingLineItem, then remove this conversion
    line_items = []
    for line_item in ticket_sale.line_items:
        line_items.append(
            NewLineItem(
                quantity=line_item.quantity,
                product_id=line_item.product.id,
                product_price=line_item.product_price,
                tax_rate_id=line_item.tax_rate_id,
            )
        )

    total_ticket_price = 0.0
    for line_item in ticket_sale.line_items:
        if line_item.product.type != ProductType.topup:
            total_ticket_price += line_item.total_price

    cash_entry_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_entry)
    cash_topup_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_topup_source)
    sumup_entry_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.sumup_entry)
    sale_exit_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.sale_exit)

    prepared_bookings: dict[BookingIdentifier, float] = {}

    if ticket_sale.payment_method == PaymentMethod.cash:
        if ticket_sale.total_price == 0.0:
            # price was 0 -> no booking necessary
            pass

        else:
            if current_till.active_cash_register_id is None:
                raise InvalidArgument("Cash payments require a cash register")
            cash_register_account_id = await get_cash_register_account_id(
                conn=conn, node=node, cash_register_id=current_till.active_cash_register_id
            )
            prepared_bookings[
                BookingIdentifier(source_account_id=cash_entry_acc.id, target_account_id=cash_register_account_id)
            ] = ticket_sale.total_price
            prepared_bookings[
                BookingIdentifier(source_account_id=cash_topup_acc.id, target_account_id=sale_exit_acc.id)
            ] = total_ticket_price

            for customer in customers:
                topup_amount = customer.top_up_amount + customer.ticket_included_top_up
                if topup_amount > 0:
                    prepared_bookings[
                        BookingIdentifier(source_account_id=cash_topup_acc.id, target_account_id=customer.account_id)
                    ] = topup_amount

    elif ticket_sale.payment_method == PaymentMethod.sumup:
        prepared_bookings[
            BookingIdentifier(source_account_id=sumup_entry_acc.id, target_account_id=sale_exit_acc.id)
        ] = total_ticket_price

        for customer in customers:
            topup_amount = customer.top_up_amount + customer.ticket_included_top_up
            if topup_amount > 0:
                prepared_bookings[
                    BookingIdentifier(source_account_id=sumup_entry_acc.id, target_account_id=customer.account_id)
                ] = topup_amount

    else:
        raise InvalidArgument("Invalid payment method")

    await book_order(
        conn=conn,
        booked_at=booked_at,
        order_type=OrderType.ticket,
        customer_account_id=oldest_customer_account_id,
        cashier_id=current_user_id,
        till_id=current_till.id,
        uuid=ticket_sale.uuid,
        cash_register_id=current_till.active_cash_register_id,
        payment_method=ticket_sale.payment_method,
        bookings=prepared_bookings,
        line_items=line_items,
    )
    return oldest_customer_account_id


async def save_pending_topup(
    conn: Connection,
    till_id: int,
    node_id: int,
    cashier_id: int | None,
    topup: CompletedTopUp,
    payment_type: PendingOrderPaymentType,
):
    await conn.execute(
        "insert into pending_sumup_order (uuid, node_id, till_id, cashier_id, order_type, order_content_version, order_content, payment_type) "
        "values ($1, $2, $3, $4, 'topup', 1, $5, $6)",
        topup.uuid,
        node_id,
        till_id,
        cashier_id,
        topup.model_dump_json(),
        payment_type.value,
    )


def load_pending_topup(pending_order: PendingOrder) -> CompletedTopUp:
    if pending_order.order_type != PendingOrderType.topup:
        raise InvalidArgument("Invalid order type found for this uuid")
    # TODO: version check
    topup = CompletedTopUp.model_validate_json(pending_order.order_content)
    return topup


async def make_topup_bookings(
    *,
    conn: Connection,
    current_till: Till,
    node: Node,
    current_user_id: int | None,
    top_up: PendingTopUp | CompletedTopUp,
    booked_at: datetime,
) -> OrderInfo:
    top_up_product = await fetch_top_up_product(conn=conn, node=node)

    line_items = [
        NewLineItem(
            quantity=1,
            product_id=top_up_product.id,
            product_price=top_up.amount,
            tax_rate_id=top_up_product.tax_rate_id,
        )
    ]

    cash_entry_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_entry)
    cash_topup_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_topup_source)

    if top_up.payment_method == PaymentMethod.cash:
        if current_till.active_cash_register_id is None:
            raise InvalidArgument("Cash payments require a cash register")
        cash_register_account_id = await get_cash_register_account_id(
            conn=conn, node=node, cash_register_id=current_till.active_cash_register_id
        )
        bookings = {
            BookingIdentifier(
                source_account_id=cash_topup_acc.id,
                target_account_id=top_up.customer_account_id,
            ): top_up.amount,
            BookingIdentifier(
                source_account_id=cash_entry_acc.id,
                target_account_id=cash_register_account_id,
            ): top_up.amount,
        }
    elif top_up.payment_method == PaymentMethod.sumup or top_up.payment_method == PaymentMethod.sumup_online:
        if top_up.payment_method == PaymentMethod.sumup:
            sumup_entry_acc = await get_system_account_for_node(
                conn=conn, node=node, account_type=AccountType.sumup_entry
            )
        else:
            sumup_entry_acc = await get_system_account_for_node(
                conn=conn, node=node, account_type=AccountType.sumup_online_entry
            )
        bookings = {
            BookingIdentifier(
                source_account_id=sumup_entry_acc.id,
                target_account_id=top_up.customer_account_id,
            ): top_up.amount
        }
    else:
        raise InvalidArgument("topups cannot be payed with a tag")

    order_info = await book_order(
        conn=conn,
        booked_at=booked_at,
        uuid=top_up.uuid,
        order_type=OrderType.top_up,
        payment_method=top_up.payment_method,
        cashier_id=current_user_id,
        till_id=current_till.id,
        customer_account_id=top_up.customer_account_id,
        cash_register_id=current_till.active_cash_register_id,
        line_items=line_items,
        bookings=bookings,
    )
    return order_info
