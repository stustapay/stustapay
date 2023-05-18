import json
import logging
from collections import defaultdict
from typing import Dict, Optional, Set

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import (
    ACCOUNT_CASH_ENTRY,
    ACCOUNT_SUMUP,
    Account,
    get_source_account,
    get_target_account,
    ACCOUNT_SALE_EXIT,
    ACCOUNT_CASH_EXIT,
    ACCOUNT_CASH_SALE_SOURCE,
)
from stustapay.core.schema.order import (
    CompletedSale,
    NewSale,
    Order,
    OrderType,
    PendingSale,
    PendingLineItem,
    PendingTopUp,
    NewTopUp,
    CompletedTopUp,
    Button,
    NewPayOut,
    PendingPayOut,
    CompletedPayOut,
    NewTicketSale,
    PendingTicketSale,
    CompletedTicketSale,
    PaymentMethod,
)
from stustapay.core.schema.product import (
    Product,
    ProductRestriction,
    TOP_UP_PRODUCT_ID,
)
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, User, CurrentUser
from stustapay.core.service.account import get_account_by_id
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbhook import DBHook
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_terminal,
    requires_user,
    with_db_transaction,
    with_retryable_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, ServiceException
from stustapay.core.service.common.notifications import Subscription
from stustapay.core.service.product import (
    fetch_discount_product,
    fetch_top_up_product,
    fetch_pay_out_product,
    fetch_product,
)
from stustapay.core.service.transaction import book_transaction
from stustapay.core.util import BaseModel
from .booking import BookingIdentifier, NewLineItem, book_order
from .stats import OrderStatsService
from .voucher import VoucherService
from ..ticket import fetch_ticket
from ...schema.ticket import Ticket

logger = logging.getLogger(__name__)


class NotEnoughFundsException(ServiceException):
    """
    The customer has not enough funds on his account to complete the order
    """

    id = "NotEnoughFunds"

    def __init__(self, needed_fund: float, available_fund: float):
        self.needed_fund = needed_fund
        self.available_fund = available_fund

    def __str__(self):
        return f"Not enough funds available:\nNeeded: {self.needed_fund}\nAvailable: {self.available_fund}"


class NotEnoughVouchersException(ServiceException):
    id = "NotEnoughVouchers"
    """
    The customer has not enough vouchers on his account to complete the order
    """

    def __init__(self, available_vouchers: int):
        self.available_vouchers = available_vouchers

    def __str__(self):
        return f"Not enough vouchers. Available: {self.available_vouchers}"


class AgeRestrictionException(ServiceException):
    """
    The customer is too young the buy the respective products
    """

    id = "AgeRestriction"

    def __init__(self, product_ids: Set[int]):
        self.product_ids = product_ids

    def __str__(self):
        return f"Too young for product: {', '.join(self.product_ids)}"


class TillPermissionException(ServiceException):
    """
    The assigned till profile does not allow this operation
    """

    id = "TillPermission"

    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg


class InvalidSaleException(ServiceException):
    """
    The sale is invalid
    """

    id = "InvalidSale"

    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg


class CustomerNotFound(ServiceException):
    """
    This customer was not found
    """

    id = "CustomerNotFound"

    def __init__(self, uid: int):
        self.uid = uid

    def __str__(self):
        return f"Customer not found: {self.uid}"


class BookedProduct(BaseModel):
    product: Product
    quantity: Optional[int] = None
    price: Optional[float] = None


class PendingTicket(BaseModel):
    ticket: Ticket
    customer_tag_uid: int


async def fetch_order(*, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
    """
    get all info about an order.
    """
    row = await conn.fetchrow("select * from order_value where id = $1", order_id)
    if row is None:
        return None

    return Order.parse_obj(row)


class OrderService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.voucher_service = VoucherService(db_pool=db_pool, config=config, auth_service=auth_service)
        self.stats = OrderStatsService(db_pool=db_pool, config=config, auth_service=auth_service)

        self.admin_order_update_queues: set[Subscription] = set()

        self.order_hook: Optional[DBHook] = None

    async def run(self):
        async with self.db_pool.acquire() as conn:
            self.order_hook = DBHook(connection=conn, channel="order", event_handler=self._handle_order_update)
            await self.order_hook.run()

    async def _propagate_order_update(self, order: Order):
        for queue in self.admin_order_update_queues:
            queue.queue.put_nowait(order)

    async def _handle_order_update(self, payload: Optional[str]):
        if payload is None:
            return

        try:
            json_payload = json.loads(payload)
            async with self.db_pool.acquire() as conn:
                async with conn.transaction():
                    order = await fetch_order(conn=conn, order_id=json_payload["order_id"])
                    if order:
                        await self._propagate_order_update(order=order)
        except:  # pylint: disable=bare-except
            return

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def register_for_order_updates(self, conn: asyncpg.Connection) -> Subscription:
        del conn  # unused

        def on_unsubscribe(subscription):
            self.admin_order_update_queues.remove(subscription)

        subscription = Subscription(on_unsubscribe)
        self.admin_order_update_queues.add(subscription)
        return subscription

    @staticmethod
    async def _get_products_from_buttons(
        *,
        conn: asyncpg.Connection,
        till_profile_id: int,
        buttons: list[Button],
    ) -> list[BookedProduct]:
        # TODO: check if the till making this sale has these buttons as part of its layout
        booked_products = []
        for button in buttons:
            product_rows = await conn.fetch(
                "select p.* from till_button_product tbp "
                "join product_with_tax_and_restrictions p on tbp.product_id = p.id "
                "join till_layout_to_button tltp on tltp.button_id = tbp.button_id "
                "join till_profile tp on tp.layout_id = tltp.layout_id "
                "where tbp.button_id = $1 and tp.id = $2",
                button.till_button_id,
                till_profile_id,
            )
            if len(product_rows) == 0:
                raise InvalidArgument("this till profile is not allowed to use these buttons")

            for row in product_rows:
                product = Product.parse_obj(row)
                if (button.price is None) != product.fixed_price:
                    raise InvalidArgument("cannot book a fixed price product with a variable price")
                if button.quantity is not None and button.quantity < 0 and not product.is_returnable:
                    raise InvalidSaleException(f"Cannot return a non returnable product {product.name}")
                booked_products.append(BookedProduct(product=product, quantity=button.quantity, price=button.price))
        return booked_products

    @staticmethod
    async def _preprocess_order_positions(
        *,
        customer_restrictions: Optional[ProductRestriction],
        booked_products: list[BookedProduct],
    ) -> list[PendingLineItem]:
        # we preprocess positions in a new order to group the resulting line items
        # by product and aggregate their quantity
        line_items_by_product: dict[int, PendingLineItem] = {}
        restricted_products = set()
        for booked_product in booked_products:
            product = booked_product.product

            if product.id in line_items_by_product:
                current_line_item = line_items_by_product[product.id]
                if current_line_item.product.fixed_price:
                    if booked_product.quantity is None:
                        raise RuntimeError("make the typechecker happy")
                    current_line_item.quantity += booked_product.quantity
                else:
                    if booked_product.price is None:
                        raise RuntimeError("make the typechecker happy")
                    current_line_item.product_price += booked_product.price
            else:
                # check product cost
                if product.fixed_price and booked_product.price:
                    raise InvalidArgument("The line item price was set for a fixed price item")
                # other case (not fixed_price and not item_price) is implicitly checked with the database constraints,
                # pydantic constraints and previous test
                price = product.price
                if not product.fixed_price:
                    price = booked_product.price
                    booked_product.quantity = 1

                if price is None or booked_product.quantity is None:
                    raise RuntimeError("invalid internal price state, should not happen")

                # check age restriction
                if customer_restrictions is not None and customer_restrictions in product.restrictions:
                    restricted_products.add(product.id)

                line_items_by_product[product.id] = PendingLineItem(
                    quantity=booked_product.quantity,
                    product_price=price,
                    tax_rate=product.tax_rate,
                    tax_name=product.tax_name,
                    product=product,
                )

        if len(restricted_products) > 0:
            raise AgeRestrictionException(restricted_products)

        line_items = list()
        for line_item in line_items_by_product.values():
            if line_item.quantity == 0:
                # quantity_not_zero constraint - skip empty items!
                continue
            line_items.append(line_item)

        return line_items

    async def _fetch_customer_by_user_tag(self, conn: asyncpg.Connection, customer_tag_uid: int) -> Account:
        customer = await conn.fetchrow(
            "select a.*, t.restriction from user_tag t join account a on t.uid = a.user_tag_uid where t.uid = $1",
            customer_tag_uid,
        )
        if customer is None:
            raise CustomerNotFound(uid=customer_tag_uid)
        return Account.parse_obj(customer)

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_topup(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, new_topup: NewTopUp
    ) -> PendingTopUp:
        if new_topup.amount <= 0.0:
            raise InvalidArgument("Only topups with a positive amount are allowed")

        if new_topup.payment_method == PaymentMethod.tag:
            raise InvalidArgument("Cannot pay with tag for top ups")

        can_top_up = await conn.fetchval(
            "select allow_top_up from till_profile where id = $1", current_terminal.till.active_profile_id
        )
        if not can_top_up:
            raise TillPermissionException("This terminal is not allowed to top up customers")

        # amount enforcement
        if new_topup.amount <= 1.00:
            raise InvalidArgument("Minimum TopUp is 1.00€")

        max_limit = 150.00
        if new_topup.amount > max_limit:
            raise InvalidArgument(f"Maximum TopUp amount is {max_limit:.02f}€")

        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_topup.uuid)
        if uuid_exists:
            raise InvalidArgument("This order has already been booked, duplicate order uuid")

        customer_account = await self._fetch_customer_by_user_tag(
            conn=conn, customer_tag_uid=new_topup.customer_tag_uid
        )

        new_balance = customer_account.balance + new_topup.amount
        if new_balance > max_limit:
            too_much = new_balance - max_limit
            raise InvalidArgument(
                f"More than {max_limit:.02f}€ on account is disallowed! "
                f"New balance would be {new_balance:.02f}€, which is {too_much:.02f}€ too much."
            )

        return PendingTopUp(
            amount=new_topup.amount,
            customer_tag_uid=new_topup.customer_tag_uid,
            payment_method=new_topup.payment_method,
            uuid=new_topup.uuid,
            customer_account_id=customer_account.id,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_topup(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: CurrentUser, new_topup: NewTopUp
    ) -> CompletedTopUp:
        assert current_user.cashier_account_id is not None

        pending_top_up: PendingTopUp = await self.check_topup(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_topup=new_topup
        )

        top_up_product = await fetch_top_up_product(conn=conn)

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=top_up_product.id,
                product_price=pending_top_up.amount,
                tax_rate=top_up_product.tax_rate,
                tax_name=top_up_product.tax_name,
            )
        ]

        if pending_top_up.payment_method == PaymentMethod.cash:
            bookings = {
                BookingIdentifier(
                    source_account_id=ACCOUNT_CASH_SALE_SOURCE, target_account_id=pending_top_up.customer_account_id
                ): pending_top_up.amount,
                BookingIdentifier(
                    source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=current_user.cashier_account_id
                ): pending_top_up.amount,
            }
        elif pending_top_up.payment_method == PaymentMethod.sumup:
            bookings = {
                BookingIdentifier(
                    source_account_id=ACCOUNT_SUMUP, target_account_id=pending_top_up.customer_account_id
                ): pending_top_up.amount
            }
        else:
            raise InvalidArgument("topups cannot be payed with a tag")

        order_info = await book_order(
            conn=conn,
            uuid=pending_top_up.uuid,
            order_type=OrderType.top_up,
            payment_method=pending_top_up.payment_method,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
            customer_account_id=pending_top_up.customer_account_id,
            cash_register_id=current_user.cash_register_id,
            line_items=line_items,
            bookings=bookings,
        )

        return CompletedTopUp(
            amount=pending_top_up.amount,
            customer_tag_uid=pending_top_up.customer_tag_uid,
            customer_account_id=pending_top_up.customer_account_id,
            payment_method=pending_top_up.payment_method,
            old_balance=pending_top_up.old_balance,
            new_balance=pending_top_up.new_balance,
            uuid=order_info.uuid,
            booked_at=order_info.booked_at,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, new_sale: NewSale
    ) -> PendingSale:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_sale.uuid)
        if uuid_exists:
            raise InvalidArgument("This order has already been booked, duplicate order uuid")

        customer_account = await self._fetch_customer_by_user_tag(conn=conn, customer_tag_uid=new_sale.customer_tag_uid)

        booked_products = await self._get_products_from_buttons(
            conn=conn, till_profile_id=current_terminal.till.active_profile_id, buttons=new_sale.buttons
        )
        line_items = await self._preprocess_order_positions(
            customer_restrictions=customer_account.restriction, booked_products=booked_products
        )

        order = PendingSale(
            uuid=new_sale.uuid,
            buttons=new_sale.buttons,
            old_balance=customer_account.balance,
            new_balance=customer_account.balance,  # will be overwritten later on
            old_voucher_balance=customer_account.vouchers,
            new_voucher_balance=customer_account.vouchers,  # will be overwritten later on
            line_items=line_items,
            customer_account_id=customer_account.id,
        )

        # if an explicit voucher amount was requested - use that as the maximum.
        vouchers_to_use = customer_account.vouchers
        if new_sale.used_vouchers is not None:
            if new_sale.used_vouchers > customer_account.vouchers:
                raise NotEnoughVouchersException(available_vouchers=customer_account.vouchers)
            vouchers_to_use = new_sale.used_vouchers
        discount_product = await fetch_discount_product(conn=conn)
        voucher_usage = self.voucher_service.compute_optimal_voucher_usage(
            max_vouchers=vouchers_to_use, line_items=order.line_items, discount_product=discount_product
        )

        order.new_voucher_balance = customer_account.vouchers - voucher_usage.used_vouchers
        order.line_items.extend(voucher_usage.additional_line_items)

        if customer_account.balance < order.total_price:
            raise NotEnoughFundsException(needed_fund=order.total_price, available_fund=customer_account.balance)
        order.new_balance = customer_account.balance - order.total_price

        return order

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: CurrentUser, new_sale: NewSale
    ) -> CompletedSale:
        """
        apply the order after all payment has been settled.
        """
        pending_sale = await self.check_sale(  # pylint: disable=unexpected-keyword-arg
            conn=conn,
            current_terminal=current_terminal,
            current_user=current_user,
            new_sale=new_sale,
        )

        line_items = []

        for line_item in pending_sale.line_items:
            line_items.append(
                NewLineItem(
                    quantity=line_item.quantity,
                    product_id=line_item.product.id,
                    product_price=line_item.product_price,
                    tax_name=line_item.tax_name,
                    tax_rate=line_item.tax_rate,
                )
            )

        # combine booking based on (source, target) -> amount
        bookings: Dict[BookingIdentifier, float] = defaultdict(lambda: 0.0)
        for line_item in pending_sale.line_items:
            product = line_item.product
            source_acc_id = get_source_account(OrderType.sale, product, pending_sale.customer_account_id)
            target_acc_id = get_target_account(OrderType.sale, product, pending_sale.customer_account_id)
            bookings[BookingIdentifier(source_account_id=source_acc_id, target_account_id=target_acc_id)] += float(
                line_item.total_price
            )

        order_info = await book_order(
            conn=conn,
            order_type=OrderType.sale,
            uuid=pending_sale.uuid,
            payment_method=PaymentMethod.tag,
            customer_account_id=pending_sale.customer_account_id,
            cashier_id=current_user.id,
            line_items=line_items,
            bookings=bookings,
            till_id=current_terminal.till.id,
        )

        if pending_sale.used_vouchers > 0:
            await book_transaction(
                conn=conn,
                order_id=order_info.id,
                source_account_id=pending_sale.customer_account_id,
                target_account_id=ACCOUNT_SALE_EXIT,
                voucher_amount=pending_sale.used_vouchers,
            )

        completed_order = CompletedSale(
            buttons=pending_sale.buttons,
            id=order_info.id,
            uuid=order_info.uuid,
            old_balance=pending_sale.old_balance,
            new_balance=pending_sale.new_balance,
            old_voucher_balance=pending_sale.old_voucher_balance,
            new_voucher_balance=pending_sale.new_voucher_balance,
            customer_account_id=pending_sale.customer_account_id,
            line_items=pending_sale.line_items,
            booked_at=order_info.booked_at,
            till_id=current_terminal.till.id,
            cashier_id=current_user.id,
        )

        customer_account_after_booking = await get_account_by_id(
            conn=conn, account_id=completed_order.customer_account_id
        )
        assert customer_account_after_booking is not None

        # adjust completed order values after real booking in database
        completed_order.new_balance = customer_account_after_booking.balance
        completed_order.new_voucher_balance = customer_account_after_booking.vouchers

        return completed_order

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def cancel_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: CurrentUser, order_id: int
    ) -> bool:
        is_order_cancelled = await conn.fetchval("select true from ordr where cancels_order = $1", order_id)
        if is_order_cancelled:
            raise InvalidArgument("Order has already been cancelled")

        order = await fetch_order(conn=conn, order_id=order_id)
        if order is None:
            return False
        if order.order_type != OrderType.sale:
            return False
        if order.payment_method != PaymentMethod.tag:
            return False

        line_items = []
        for line_item in order.line_items:
            line_items.append(
                NewLineItem(
                    quantity=-line_item.quantity,
                    product_id=line_item.product.id,
                    tax_name=line_item.tax_name,
                    tax_rate=line_item.tax_rate,
                    product_price=line_item.product_price,
                )
            )

        order_info = await book_order(
            conn=conn,
            order_type=OrderType.cancel_sale,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
            customer_account_id=order.customer_account_id,
            cancels_order=order.id,
            payment_method=order.payment_method,
            line_items=line_items,
            bookings={},
        )

        transactions = await conn.fetch("select * from transaction where order_id = $1", order.id)
        for transaction in transactions:
            await conn.fetchval(
                "select * from book_transaction("
                "   order_id => $1,"
                "   description => $2,"
                "   source_account_id => $3,"
                "   target_account_id => $4,"
                "   amount => $5,"
                "   vouchers_amount => $6)",
                order_info.id,
                transaction["description"],
                transaction["target_account"],
                transaction["source_account"],
                transaction["amount"],
                transaction["vouchers"],
            )

        return True

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_pay_out(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, new_pay_out: NewPayOut
    ) -> PendingPayOut:
        if new_pay_out.amount is not None and new_pay_out.amount > 0.0:
            raise InvalidArgument("Only payouts with a negative amount are allowed")

        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_pay_out.uuid)
        if uuid_exists:
            raise InvalidArgument("This order has already been booked, duplicate order uuid")

        can_pay_out = await conn.fetchval(
            "select allow_cash_out from till_profile where id = $1", current_terminal.till.active_profile_id
        )
        if not can_pay_out:
            raise TillPermissionException("This terminal is not allowed to pay out customers")

        customer_account = await self._fetch_customer_by_user_tag(
            conn=conn, customer_tag_uid=new_pay_out.customer_tag_uid
        )

        if new_pay_out.amount is None:
            new_pay_out.amount = -customer_account.balance

        new_balance = customer_account.balance + new_pay_out.amount

        if new_balance < 0:
            raise NotEnoughFundsException(needed_fund=abs(new_pay_out.amount), available_fund=customer_account.balance)

        return PendingPayOut(
            uuid=new_pay_out.uuid,
            amount=new_pay_out.amount,
            customer_tag_uid=new_pay_out.customer_tag_uid,
            customer_account_id=customer_account.id,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_pay_out(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: CurrentUser, new_pay_out: NewPayOut
    ) -> CompletedPayOut:
        assert current_user.cashier_account_id is not None
        pending_pay_out: PendingPayOut = await self.check_pay_out(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_pay_out=new_pay_out
        )

        pay_out_product = await fetch_pay_out_product(conn=conn)

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=pay_out_product.id,
                product_price=pending_pay_out.amount,
                tax_name=pay_out_product.tax_name,
                tax_rate=pay_out_product.tax_rate,
            )
        ]

        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=pending_pay_out.customer_account_id, target_account_id=ACCOUNT_CASH_SALE_SOURCE
            ): -pending_pay_out.amount,
            BookingIdentifier(
                source_account_id=current_user.cashier_account_id, target_account_id=ACCOUNT_CASH_EXIT
            ): -pending_pay_out.amount,
        }

        order_info = await book_order(
            conn=conn,
            uuid=pending_pay_out.uuid,
            order_type=OrderType.pay_out,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
            customer_account_id=pending_pay_out.customer_account_id,
            payment_method=PaymentMethod.cash,
            cash_register_id=current_user.cash_register_id,
            line_items=line_items,
            bookings=prepared_bookings,
        )

        return CompletedPayOut(
            amount=pending_pay_out.amount,
            customer_tag_uid=pending_pay_out.customer_tag_uid,
            customer_account_id=pending_pay_out.customer_account_id,
            old_balance=pending_pay_out.old_balance,
            new_balance=pending_pay_out.new_balance,
            uuid=order_info.uuid,
            booked_at=order_info.booked_at,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_ticket_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, new_ticket_sale: NewTicketSale
    ) -> tuple[PendingTicketSale, list[PendingTicket]]:
        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_ticket_sale.uuid)
        if uuid_exists:
            raise InvalidArgument("This order has already been booked, duplicate order uuid")

        if new_ticket_sale.payment_method == PaymentMethod.tag:
            raise InvalidArgument("Cannot pay with tag for a ticket")

        can_sell_tickets = await conn.fetchval(
            "select allow_ticket_sale from till_profile where id = $1", current_terminal.till.active_profile_id
        )
        if not can_sell_tickets:
            raise TillPermissionException("This terminal is not allowed to sell tickets")

        known_accounts = await conn.fetch(
            "select user_tag_uid from account where user_tag_uid = ANY($1::numeric(20)[])",
            [button.customer_tag_uid for button in new_ticket_sale.tickets],
        )

        if len(known_accounts) > 0:
            raise InvalidArgument(
                f"Ticket already has account: " f"{', '.join('%X' % int(a['user_tag_uid']) for a in known_accounts)}"
            )

        # mapping of product id to pending line item
        ticket_line_items: dict[int, PendingLineItem] = {}
        pending_tickets = []

        top_up_product = await fetch_top_up_product(conn=conn)
        top_up_line_item = PendingLineItem(
            quantity=1,
            product=top_up_product,
            product_price=0,
            tax_name=top_up_product.tax_name,
            tax_rate=top_up_product.tax_rate,
        )

        for ticket_button in new_ticket_sale.tickets:
            # till button id is the same as the ticket id since we do not have an indirection there
            ticket = await fetch_ticket(conn=conn, ticket_id=ticket_button.till_button_id)
            if ticket is None:
                raise InvalidArgument(f"Ticket with button id {ticket_button.till_button_id} does not exist")
            layout_allows_button = await conn.fetchval(
                "select exists("
                "   select from till_layout_to_ticket tltt join till_profile tp on tltt.layout_id = tp.layout_id "
                "   where tltt.ticket_id = $1 and tp.id = $2"
                ")",
                ticket.id,
                current_terminal.till.active_profile_id,
            )
            if not layout_allows_button:
                raise InvalidArgument(f"Till layout is not allowed to book ticket {ticket.name}")
            ticket_product = await fetch_product(conn=conn, product_id=ticket.product_id)
            assert ticket_product is not None

            if ticket.product_id in ticket_line_items:
                ticket_line_items[ticket.product_id].quantity += 1
            else:
                ticket_line_items[ticket.product_id] = PendingLineItem(
                    quantity=1,
                    product=ticket_product,
                    product_price=ticket_product.price,
                    tax_name=ticket_product.tax_name,
                    tax_rate=ticket_product.tax_rate,
                )
            if ticket.initial_top_up_amount > 0:
                # wtf, pylint does not recognise this member
                top_up_line_item.product_price += ticket.initial_top_up_amount  # pylint: disable=no-member

            row = await conn.fetchrow(
                "select uid, restriction from user_tag where uid = $1", ticket_button.customer_tag_uid
            )
            if row is None:
                raise InvalidArgument(f"Tag with uid {ticket_button.customer_tag_uid:X} does not exist")
            ticket_restriction_name = ticket.restriction.name if ticket.restriction is not None else None
            tag_restriction = row["restriction"]
            if tag_restriction != ticket_restriction_name:
                raise InvalidArgument(
                    "Ticket restriction does not match up with scanned tag. "
                    f"Ticket has restriction {ticket_restriction_name}, scanned tag has restriction {tag_restriction}"
                )

            pending_tickets.append(
                PendingTicket(
                    customer_tag_uid=ticket_button.customer_tag_uid,
                    ticket=ticket,
                )
            )

        line_items = list(ticket_line_items.values()) + [top_up_line_item]

        return (
            PendingTicketSale(
                uuid=new_ticket_sale.uuid,
                payment_method=new_ticket_sale.payment_method,
                tickets=new_ticket_sale.tickets,
                line_items=line_items,
            ),
            pending_tickets,
        )

    @staticmethod
    def _find_oldest_customer(customers: dict[int, tuple[float, Optional[str]]]) -> int:
        oldest_customer = None
        for account_id, restriction in customers.items():
            if oldest_customer is None:
                oldest_customer = (account_id, restriction)
                if restriction is None:
                    return oldest_customer[0]
                continue
            if restriction is None:
                return account_id

            if (
                oldest_customer[1] == ProductRestriction.under_16.name
                and restriction == ProductRestriction.under_18.name
            ):
                oldest_customer = (account_id, restriction)

        assert oldest_customer is not None

        return oldest_customer[0]

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_ticket_sale(
        self,
        *,
        conn: asyncpg.Connection,
        current_terminal: Terminal,
        current_user: CurrentUser,
        new_ticket_sale: NewTicketSale,
    ) -> CompletedTicketSale:
        assert current_user.cashier_account_id is not None
        pending_ticket_sale, pending_tickets = await self.check_ticket_sale(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_ticket_sale=new_ticket_sale
        )

        # create a new customer account for the given tag ,
        # store the initial topup amount as well as restrictionfor each newly created customer
        customers: dict[int, tuple[float, Optional[str]]] = {}
        for pending_ticket in pending_tickets:
            restriction = await conn.fetchval(
                "select restriction from user_tag where uid = $1", pending_ticket.customer_tag_uid
            )
            customer_account_id = await conn.fetchval(
                "insert into account (user_tag_uid, type) values ($1, 'private') returning id",
                pending_ticket.customer_tag_uid,
            )
            customers[customer_account_id] = (pending_ticket.ticket.initial_top_up_amount, restriction)

        oldest_customer_account_id = self._find_oldest_customer(customers)

        line_items = []
        for line_item in pending_ticket_sale.line_items:
            line_items.append(
                NewLineItem(
                    quantity=line_item.quantity,
                    product_id=line_item.product.id,
                    product_price=line_item.product_price,
                    tax_name=line_item.tax_name,
                    tax_rate=line_item.tax_rate,
                )
            )

        total_ticket_price = 0.0
        for line_item in pending_ticket_sale.line_items:
            if line_item.product.id != TOP_UP_PRODUCT_ID:
                total_ticket_price += line_item.total_price

        prepared_bookings: dict[BookingIdentifier, float] = {}
        if pending_ticket_sale.payment_method == PaymentMethod.cash:
            prepared_bookings[
                BookingIdentifier(
                    source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=current_user.cashier_account_id
                )
            ] = pending_ticket_sale.total_price
            prepared_bookings[
                BookingIdentifier(source_account_id=ACCOUNT_CASH_SALE_SOURCE, target_account_id=ACCOUNT_SALE_EXIT)
            ] = total_ticket_price
            for customer_account_id in customers.keys():
                topup_amount = customers[customer_account_id][0]
                prepared_bookings[
                    BookingIdentifier(source_account_id=ACCOUNT_CASH_SALE_SOURCE, target_account_id=customer_account_id)
                ] = topup_amount
        elif pending_ticket_sale.payment_method == PaymentMethod.sumup:
            prepared_bookings[
                BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=ACCOUNT_SALE_EXIT)
            ] = total_ticket_price
            for customer_account_id in customers.keys():
                topup_amount = customers[customer_account_id][0]
                prepared_bookings[
                    BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=customer_account_id)
                ] = topup_amount
        else:
            raise InvalidArgument("Invalid payment method")

        order_info = await book_order(
            conn=conn,
            order_type=OrderType.ticket,
            customer_account_id=oldest_customer_account_id,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
            uuid=new_ticket_sale.uuid,
            cash_register_id=current_user.cash_register_id,
            payment_method=pending_ticket_sale.payment_method,
            bookings=prepared_bookings,
            line_items=line_items,
        )

        return CompletedTicketSale(
            id=order_info.id,
            payment_method=pending_ticket_sale.payment_method,
            customer_account_id=oldest_customer_account_id,
            line_items=pending_ticket_sale.line_items,
            uuid=order_info.uuid,
            booked_at=order_info.booked_at,
            cashier_id=current_user.id,
            tickets=pending_ticket_sale.tickets,
            till_id=current_terminal.till.id,
        )

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def show_order(self, *, conn: asyncpg.Connection, current_user: User, order_id: int) -> Optional[Order]:
        order = await fetch_order(conn=conn, order_id=order_id)
        if order is not None and order.cashier_id == current_user.id:
            return order
        return None

    @with_db_transaction
    @requires_terminal([Privilege.can_book_orders])
    async def list_orders_terminal(self, *, conn: asyncpg.Connection, current_user: User) -> list[Order]:
        cursor = conn.cursor("select * from order_value where cashier_id = $1", current_user.id)
        result = []
        async for row in cursor:
            result.append(Order.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def list_orders(self, *, conn: asyncpg.Connection, customer_account_id: Optional[int] = None) -> list[Order]:
        if customer_account_id is not None:
            cursor = conn.cursor("select * from order_value where customer_account_id = $1", customer_account_id)
        else:
            cursor = conn.cursor("select * from order_value")
        result = []
        async for row in cursor:
            result.append(Order.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def list_orders_by_till(self, *, conn: asyncpg.Connection, till_id: int) -> list[Order]:
        cursor = conn.cursor("select * from order_value where till_id = $1", till_id)
        result = []
        async for row in cursor:
            result.append(Order.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.order_management])
    async def get_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        return await fetch_order(conn=conn, order_id=order_id)
