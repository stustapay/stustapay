import json
import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Optional, Set

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import (
    ACCOUNT_CASH_ENTRY,
    ACCOUNT_CASH_VAULT,
    ACCOUNT_SUMUP,
    Account,
    get_source_account,
    get_target_account,
    ACCOUNT_SALE_EXIT,
    ACCOUNT_CASH_EXIT,
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
    PAY_OUT_PRODUCT_ID,
    TICKET_PRODUCT_ID,
    TICKET_U18_PRODUCT_ID,
    TICKET_U16_PRODUCT_ID,
)
from stustapay.core.schema.terminal import Terminal, ENTRY_BUTTON_ID, ENTRY_U18_BUTTON_ID, ENTRY_U16_BUTTON_ID
from stustapay.core.schema.user import Privilege, User
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
    fetch_ticket_product,
    fetch_ticket_product_u16,
    fetch_ticket_product_u18,
    fetch_top_up_product,
    fetch_initial_topup_amount,
)
from stustapay.core.service.transaction import book_transaction
from stustapay.core.util import BaseModel
from .voucher import VoucherService
from ..account import get_account_by_id

logger = logging.getLogger(__name__)


@dataclass(eq=True, frozen=True)
class BookingIdentifier:
    source_account_id: int
    target_account_id: int


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


class OrderService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.voucher_service = VoucherService(db_pool=db_pool, config=config, auth_service=auth_service)

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
                    order = await self._fetch_order(conn=conn, order_id=json_payload["order_id"])
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
        buttons: list[Button],
    ) -> list[BookedProduct]:
        # TODO: check if the till making this sale has these buttons as part of its layout
        booked_products = []
        for button in buttons:
            product_rows = await conn.fetch(
                "select p.* from till_button_product tbp "
                "join product_with_tax_and_restrictions p on tbp.product_id = p.id "
                "where button_id = $1",
                button.till_button_id,
            )
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

    async def _book_topup_cash_order(
        self, *, conn: asyncpg.Connection, order_id: int, amount: float, customer_account_id: int, cashier: User
    ):
        """
        The customer pays cash money to get funds on hist customer account
        It books the money from the cash input to the current cashier's register and
        from the cash vault to the customer
        """
        assert cashier.cashier_account_id is not None
        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(source_account_id=ACCOUNT_CASH_VAULT, target_account_id=customer_account_id): amount,
            BookingIdentifier(
                source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=cashier.cashier_account_id
            ): amount,
        }

        await self._book_prepared_bookings(conn=conn, order_id=order_id, bookings=prepared_bookings)

    async def _book_topup_sumup_order(
        self, *, conn: asyncpg.Connection, order_id: int, amount: float, customer_account_id: int
    ):
        """
        The customer pays ec money (via sumup) to get funds on the customer account
        It books the money from the sumup input directly to the customer
        """
        prepared_bookings = {
            BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=customer_account_id): amount
        }
        await self._book_prepared_bookings(conn=conn, order_id=order_id, bookings=prepared_bookings)

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_topup(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, new_topup: NewTopUp
    ) -> CompletedTopUp:
        pending_top_up: PendingTopUp = await self.check_topup(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_topup=new_topup
        )

        order_row = await conn.fetchrow(
            "insert into ordr (uuid, item_count, order_type, cashier_id, till_id, customer_account_id, payment_method) "
            "values ($1, $2, $3, $4, $5, $6, $7) "
            "returning id, uuid, booked_at",
            pending_top_up.uuid or uuid.uuid4(),
            1,  # item_count
            OrderType.top_up.name,
            current_user.id,
            current_terminal.till.id,
            pending_top_up.customer_account_id,
            pending_top_up.payment_method.name,
        )
        order_id = order_row["id"]
        order_uuid = order_row["uuid"]
        booked_at = order_row["booked_at"]

        await conn.execute(
            "insert into line_item (order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate) "
            "values ($1, $2, $3, $4, $5, $6, $7)",
            order_id,
            1,
            TOP_UP_PRODUCT_ID,
            1,
            pending_top_up.amount,
            "none",
            0,
        )

        if pending_top_up.payment_method == PaymentMethod.cash:
            await self._book_topup_cash_order(
                conn=conn,
                order_id=order_id,
                amount=pending_top_up.amount,
                customer_account_id=pending_top_up.customer_account_id,
                cashier=current_user,
            )
        elif pending_top_up.payment_method == PaymentMethod.sumup:
            await self._book_topup_sumup_order(
                conn=conn,
                order_id=order_id,
                amount=pending_top_up.amount,
                customer_account_id=pending_top_up.customer_account_id,
            )
        else:
            raise NotImplementedError()

        return CompletedTopUp(
            amount=pending_top_up.amount,
            customer_tag_uid=pending_top_up.customer_tag_uid,
            customer_account_id=pending_top_up.customer_account_id,
            payment_method=pending_top_up.payment_method,
            old_balance=pending_top_up.old_balance,
            new_balance=pending_top_up.new_balance,
            uuid=order_uuid,
            booked_at=booked_at,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_sale(self, *, conn: asyncpg.Connection, new_sale: NewSale) -> PendingSale:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        customer_account = await self._fetch_customer_by_user_tag(conn=conn, customer_tag_uid=new_sale.customer_tag_uid)

        booked_products = await self._get_products_from_buttons(conn=conn, buttons=new_sale.buttons)
        line_items = await self._preprocess_order_positions(
            customer_restrictions=customer_account.restriction, booked_products=booked_products
        )

        order = PendingSale(
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
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, new_sale: NewSale
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

        order_row = await conn.fetchrow(
            "insert into ordr (uuid, item_count, order_type, cashier_id, till_id, customer_account_id, payment_method) "
            "values ($1, $2, $3, $4, $5, $6, $7) "
            "returning id, uuid, booked_at",
            uuid.uuid4(),
            len(pending_sale.line_items),
            OrderType.sale.name,
            current_user.id,
            current_terminal.till.id,
            pending_sale.customer_account_id,
            "tag",  # sales can only be booked when payed with a user tag
        )
        order_id = order_row["id"]
        order_uuid = order_row["uuid"]
        booked_at = order_row["booked_at"]

        for item_id, line_item in enumerate(pending_sale.line_items):
            await conn.execute(
                "insert into line_item (order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                item_id,
                line_item.product.id,
                line_item.quantity,
                line_item.product_price,
                line_item.tax_name,
                line_item.tax_rate,
            )

        completed_order = CompletedSale(
            buttons=pending_sale.buttons,
            id=order_id,
            uuid=order_uuid,
            old_balance=pending_sale.old_balance,
            new_balance=pending_sale.new_balance,
            old_voucher_balance=pending_sale.old_voucher_balance,
            new_voucher_balance=pending_sale.new_voucher_balance,
            customer_account_id=pending_sale.customer_account_id,
            line_items=pending_sale.line_items,
            booked_at=booked_at,
            till_id=current_terminal.till.id,
            cashier_id=current_user.id,
        )

        # combine booking based on (source, target) -> amount
        prepared_bookings: Dict[BookingIdentifier, float] = defaultdict(lambda: 0.0)
        for line_item in completed_order.line_items:
            product = line_item.product
            source_acc_id = get_source_account(OrderType.sale, product, pending_sale.customer_account_id)
            target_acc_id = get_target_account(OrderType.sale, product, pending_sale.customer_account_id)
            prepared_bookings[
                BookingIdentifier(source_account_id=source_acc_id, target_account_id=target_acc_id)
            ] += float(line_item.total_price)

        if completed_order.used_vouchers > 0:
            await book_transaction(
                conn=conn,
                order_id=order_id,
                source_account_id=completed_order.customer_account_id,
                target_account_id=ACCOUNT_SALE_EXIT,
                voucher_amount=completed_order.used_vouchers,
            )

        await self._book_prepared_bookings(conn=conn, order_id=completed_order.id, bookings=prepared_bookings)

        customer_account_after_booking = await get_account_by_id(
            conn=conn, account_id=completed_order.customer_account_id
        )
        if customer_account_after_booking is None:
            raise RuntimeError("customer was deleted unexpectedly, this should not happen")

        # adjust completed order values after real booking in database
        completed_order.new_balance = customer_account_after_booking.balance
        completed_order.new_voucher_balance = customer_account_after_booking.vouchers

        return completed_order

    @staticmethod
    async def _book_prepared_bookings(
        *, conn: asyncpg.Connection, order_id: int, bookings: Dict[BookingIdentifier, float]
    ):
        """
        insert the selected bookings into the database.
        bookings are (source, target, tax) -> amount
        """
        for booking_identifier, amount in bookings.items():
            await book_transaction(
                conn=conn,
                order_id=order_id,
                source_account_id=booking_identifier.source_account_id,
                target_account_id=booking_identifier.target_account_id,
                amount=amount,
            )

    @staticmethod
    async def _fetch_order(*, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        """
        get all info about an order.
        """
        row = await conn.fetchrow("select * from order_value where id = $1", order_id)
        if row is None:
            return None

        return Order.parse_obj(row)

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def cancel_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, order_id: int
    ) -> bool:
        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is None:
            return False
        if order.order_type != OrderType.sale:
            return False
        if order.payment_method != PaymentMethod.tag:
            return False

        order_row = await conn.fetchrow(
            "insert into ordr ("
            "   item_count, order_type, cashier_id, till_id, customer_account_id, cancels_order, payment_method) "
            "values ($1, $2, $3, $4, $5, $6, $7) "
            "returning id, uuid, booked_at",
            len(order.line_items),
            OrderType.cancel_sale.name,
            current_user.id,
            current_terminal.till.id,
            order.customer_account_id,
            order.id,
            order.payment_method.name,
        )
        order_id = order_row["id"]

        for line_item in order.line_items:
            await conn.execute(
                "insert into line_item (order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                line_item.item_id,
                line_item.product.id,
                -line_item.quantity,
                line_item.product_price,
                line_item.tax_name,
                line_item.tax_rate,
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
                order_id,
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
            amount=new_pay_out.amount,
            customer_tag_uid=new_pay_out.customer_tag_uid,
            customer_account_id=customer_account.id,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_pay_out(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, new_pay_out: NewPayOut
    ) -> CompletedPayOut:
        assert current_user.cashier_account_id is not None
        pending_pay_out: PendingPayOut = await self.check_pay_out(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_pay_out=new_pay_out
        )

        order_row = await conn.fetchrow(
            "insert into ordr(item_count, order_type, cashier_id, till_id, customer_account_id, payment_method) "
            "values (1, 'pay_out', $1, $2, $3, $4) "
            "returning id, uuid, booked_at",
            current_user.id,
            current_terminal.till.id,
            pending_pay_out.customer_account_id,
            PaymentMethod.tag.name,  # payouts as orders using this API can only be processed as direct cash payouts
        )
        order_id = order_row["id"]
        order_uuid = order_row["uuid"]
        booked_at = order_row["booked_at"]

        await conn.execute(
            "insert into line_item (order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate) "
            "values ($1, $2, $3, $4, $5, $6, $7)",
            order_id,
            1,  # item_id
            PAY_OUT_PRODUCT_ID,
            1,  # quantity
            pending_pay_out.amount,
            "none",
            0,
        )

        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=pending_pay_out.customer_account_id, target_account_id=ACCOUNT_CASH_VAULT
            ): -pending_pay_out.amount,
            BookingIdentifier(
                source_account_id=current_user.cashier_account_id, target_account_id=ACCOUNT_CASH_EXIT
            ): -pending_pay_out.amount,
        }

        await self._book_prepared_bookings(conn=conn, order_id=order_id, bookings=prepared_bookings)

        return CompletedPayOut(
            amount=pending_pay_out.amount,
            customer_tag_uid=pending_pay_out.customer_tag_uid,
            customer_account_id=pending_pay_out.customer_account_id,
            old_balance=pending_pay_out.old_balance,
            new_balance=pending_pay_out.new_balance,
            uuid=order_uuid,
            booked_at=booked_at,
            cashier_id=current_user.id,
            till_id=current_terminal.till.id,
        )

    @with_retryable_db_transaction()
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_ticket_sale(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, new_ticket_sale: NewTicketSale
    ) -> PendingTicketSale:
        if new_ticket_sale.payment_method == PaymentMethod.tag:
            raise InvalidArgument("Cannot pay with tag for a ticket")

        can_sell_tickets = await conn.fetchval(
            "select allow_ticket_sale from till_profile where id = $1", current_terminal.till.active_profile_id
        )
        if not can_sell_tickets:
            raise TillPermissionException("This terminal is not allowed to sell tickets")

        expected_tag_counts = {
            ProductRestriction.under_18.name: 0,
            ProductRestriction.under_16.name: 0,
            None: 0,
        }

        for ticket in new_ticket_sale.tickets:
            if ticket.till_button_id == ENTRY_BUTTON_ID:
                expected_tag_counts[None] += ticket.quantity
            elif ticket.till_button_id == ENTRY_U18_BUTTON_ID:
                expected_tag_counts[ProductRestriction.under_18.name] += ticket.quantity
            elif ticket.till_button_id == ENTRY_U16_BUTTON_ID:
                expected_tag_counts[ProductRestriction.under_16.name] += ticket.quantity
            else:
                raise InvalidArgument(f"Invalid till button id: {ticket.till_button_id}")
        n_expected_tickets = sum(expected_tag_counts.values())

        if n_expected_tickets != len(new_ticket_sale.customer_tag_uids):
            raise InvalidArgument(
                f"Should get {n_expected_tickets} scanned tags, " f"but got {len(new_ticket_sale.customer_tag_uids)}"
            )

        scanned_tags_with_restrictions = {
            ProductRestriction.under_18.name: 0,
            ProductRestriction.under_16.name: 0,
            None: 0,
        }

        for customer_tag_uid in new_ticket_sale.customer_tag_uids:
            row = await conn.fetchrow("select uid, restriction from user_tag where uid = $1", customer_tag_uid)
            scanned_tags_with_restrictions[row["restriction"]] += 1

        for restriction in scanned_tags_with_restrictions:
            if scanned_tags_with_restrictions[restriction] != expected_tag_counts[restriction]:
                raise InvalidArgument("Number of tickets (u18 / u16) does not match up with scanned tags")

        line_items = []
        if expected_tag_counts[None] != 0:
            ticket_product = await fetch_ticket_product(conn=conn)
            assert ticket_product.price is not None
            line_items.append(
                PendingLineItem(
                    quantity=expected_tag_counts[None],
                    product=ticket_product,
                    product_price=ticket_product.price,
                    tax_name=ticket_product.tax_name,
                    tax_rate=ticket_product.tax_rate,
                )
            )
        if expected_tag_counts[ProductRestriction.under_16.name] != 0:
            ticket_product = await fetch_ticket_product_u16(conn=conn)
            assert ticket_product.price is not None
            line_items.append(
                PendingLineItem(
                    quantity=expected_tag_counts[ProductRestriction.under_16.name],
                    product=ticket_product,
                    product_price=ticket_product.price,
                    tax_name=ticket_product.tax_name,
                    tax_rate=ticket_product.tax_rate,
                )
            )
        if expected_tag_counts[ProductRestriction.under_18.name] != 0:
            ticket_product = await fetch_ticket_product_u18(conn=conn)
            assert ticket_product.price is not None
            line_items.append(
                PendingLineItem(
                    quantity=expected_tag_counts[ProductRestriction.under_18.name],
                    product=ticket_product,
                    product_price=ticket_product.price,
                    tax_name=ticket_product.tax_name,
                    tax_rate=ticket_product.tax_rate,
                )
            )

        top_up_product = await fetch_top_up_product(conn=conn)
        initial_topup_amount = await fetch_initial_topup_amount(conn=conn)
        line_items.append(
            PendingLineItem(
                quantity=1,
                product=top_up_product,
                product_price=initial_topup_amount * n_expected_tickets,
                tax_name=top_up_product.tax_name,
                tax_rate=top_up_product.tax_rate,
            )
        )

        return PendingTicketSale(
            payment_method=new_ticket_sale.payment_method,
            customer_tag_uids=new_ticket_sale.customer_tag_uids,
            tickets=new_ticket_sale.tickets,
            line_items=line_items,
        )

    @staticmethod
    def _find_oldest_customer(customers: dict[int, Optional[str]]) -> int:
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
        current_user: User,
        new_ticket_sale: NewTicketSale,
    ) -> CompletedTicketSale:
        assert current_user.cashier_account_id is not None
        pending_ticket_sale: PendingTicketSale = await self.check_ticket_sale(  # pylint: disable=unexpected-keyword-arg
            conn=conn, current_terminal=current_terminal, current_user=current_user, new_ticket_sale=new_ticket_sale
        )

        # create a new customer account for the given tag
        customers: dict[int, Optional[str]] = {}
        for customer_tag_uid in new_ticket_sale.customer_tag_uids:
            restriction = await conn.fetchval("select restriction from user_tag where uid = $1", customer_tag_uid)
            customer_account_id = await conn.fetchval(
                "insert into account (user_tag_uid, type) values ($1, 'private') returning id",
                customer_tag_uid,
            )
            customers[customer_account_id] = restriction

        oldest_customer_account_id = self._find_oldest_customer(customers)

        order_row = await conn.fetchrow(
            "insert into ordr(uuid, item_count, order_type, cashier_id, till_id, customer_account_id, payment_method) "
            "values ($1, $2, $3, $4, $5, $6, $7) "
            "returning id, uuid, booked_at",
            new_ticket_sale.uuid or uuid.uuid4(),
            pending_ticket_sale.item_count,
            OrderType.ticket.name,
            current_user.id,
            current_terminal.till.id,
            oldest_customer_account_id,
            pending_ticket_sale.payment_method.name,
        )
        order_id = order_row["id"]
        order_uuid = order_row["uuid"]
        booked_at = order_row["booked_at"]

        for item_id, line_item in enumerate(pending_ticket_sale.line_items):
            await conn.execute(
                "insert into line_item (order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                item_id,
                line_item.product.id,
                line_item.quantity,
                line_item.product_price,
                line_item.tax_name,
                line_item.tax_rate,
            )

        total_ticket_price = 0.0
        for line_item in pending_ticket_sale.line_items:
            if line_item.product.id in {TICKET_PRODUCT_ID, TICKET_U18_PRODUCT_ID, TICKET_U16_PRODUCT_ID}:
                total_ticket_price += line_item.total_price
        initial_top_up_amount = await fetch_initial_topup_amount(conn=conn)

        prepared_bookings: dict[BookingIdentifier, float] = {}
        if pending_ticket_sale.payment_method == PaymentMethod.cash:
            prepared_bookings[
                BookingIdentifier(
                    source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=current_user.cashier_account_id
                )
            ] = pending_ticket_sale.total_price
            prepared_bookings[
                BookingIdentifier(source_account_id=ACCOUNT_CASH_VAULT, target_account_id=ACCOUNT_SALE_EXIT)
            ] = total_ticket_price
            for customer_account_id in customers.keys():
                prepared_bookings[
                    BookingIdentifier(source_account_id=ACCOUNT_CASH_VAULT, target_account_id=customer_account_id)
                ] = initial_top_up_amount
        elif pending_ticket_sale.payment_method == PaymentMethod.sumup:
            prepared_bookings[
                BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=ACCOUNT_SALE_EXIT)
            ] = total_ticket_price
            for customer_account_id in customers.keys():
                prepared_bookings[
                    BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=customer_account_id)
                ] = initial_top_up_amount
        else:
            raise InvalidArgument("Invalid payment method")

        await self._book_prepared_bookings(conn=conn, order_id=order_id, bookings=prepared_bookings)

        return CompletedTicketSale(
            id=order_id,
            payment_method=pending_ticket_sale.payment_method,
            customer_tag_uids=pending_ticket_sale.customer_tag_uids,
            customer_account_id=oldest_customer_account_id,
            line_items=pending_ticket_sale.line_items,
            uuid=order_uuid,
            booked_at=booked_at,
            cashier_id=current_user.id,
            tickets=pending_ticket_sale.tickets,
            till_id=current_terminal.till.id,
        )

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def show_order(self, *, conn: asyncpg.Connection, current_user: User, order_id: int) -> Optional[Order]:
        order = await self._fetch_order(conn=conn, order_id=order_id)
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
        return await self._fetch_order(conn=conn, order_id=order_id)
