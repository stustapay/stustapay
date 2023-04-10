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
)
from stustapay.core.schema.order import (
    CompletedOrder,
    NewOrder,
    Order,
    OrderType,
    PendingOrder,
    PendingLineItem,
    NewLineItem,
)
from stustapay.core.schema.product import Product, DISCOUNT_PRODUCT_ID, ProductRestriction
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, User
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbhook import DBHook
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_terminal, requires_user_privileges, with_db_transaction
from stustapay.core.service.common.error import InvalidArgument, NotFound, ServiceException
from stustapay.core.service.common.notifications import Subscription
from .voucher import VoucherService

logger = logging.getLogger(__name__)


@dataclass(eq=True, frozen=True)
class BookingIdentifier:
    source_account_id: int
    target_account_id: int


class NotEnoughFundsException(ServiceException):
    id = "NotEnoughFunds"
    description = "The customer has not enough funds on his account to complete the order"

    def __init__(self, needed_fund: float, available_fund: float):
        self.needed_fund = needed_fund
        self.available_fund = available_fund


class NotEnoughVouchersException(ServiceException):
    id = "NotEnoughVouchers"
    description = "The customer has not enough vouchers on his account to complete the order"

    def __init__(self, available_vouchers: int):
        self.available_vouchers = available_vouchers


class AgeRestrictionException(ServiceException):
    id = "AgeRestriction"
    description = "The customer is too young the buy the respective products"

    def __init__(self, product_ids: Set[int]):
        self.product_ids = product_ids


class OrderService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.voucher_service = VoucherService(db_pool=db_pool, config=config, auth_service=auth_service)

        self.admin_order_update_queues: set[Subscription] = set()

    async def run(self):
        async with self.db_pool.acquire() as conn:
            order_hook = DBHook(connection=conn, channel="order", event_handler=self._handle_order_update)
            await order_hook.run()

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
    @requires_user_privileges([Privilege.admin])
    async def register_for_order_updates(self, conn: asyncpg.Connection) -> Subscription:
        del conn  # unused

        def on_unsubscribe(subscription):
            self.admin_order_update_queues.remove(subscription)

        subscription = Subscription(on_unsubscribe)
        self.admin_order_update_queues.add(subscription)
        return subscription

    @staticmethod
    async def _fetch_product(*, conn: asyncpg.Connection, product_id: int) -> Optional[Product]:
        row = await conn.fetchrow("select * from product_with_tax_and_restrictions where id = $1", product_id)
        if row is None:
            return None
        return Product.parse_obj(row)

    async def _fetch_discount_product(self, *, conn: asyncpg.Connection) -> Product:
        product = await self._fetch_product(conn=conn, product_id=DISCOUNT_PRODUCT_ID)
        if product is None:
            raise RuntimeError("now discount product found in database")
        return product

    async def _preprocess_order_positions(
        self,
        *,
        conn: asyncpg.Connection,
        customer_restrictions: Optional[ProductRestriction],
        positions: list[NewLineItem],
    ) -> list[PendingLineItem]:
        # we preprocess positions in a new order to group the resulting line items
        # by product and aggregate their quantity
        line_items_by_product: dict[int, PendingLineItem] = {}
        restricted_products = set()
        for item in positions:
            product_id = item.product_id
            item_quantity = item.quantity
            item_price = item.price

            if product_id in line_items_by_product:
                current_line_item = line_items_by_product[product_id]
                if not current_line_item.product.fixed_price:
                    raise InvalidArgument("Cannot book the same product with different prices")

                if item_quantity is None:
                    raise RuntimeError("invalid internal line item state, should not happen")

                current_line_item.quantity += item_quantity
            else:
                # check product cost
                product = await self._fetch_product(conn=conn, product_id=product_id)
                if product is None:
                    raise NotFound(element_typ="product", element_id=str(product_id))
                if product.fixed_price and item_price:
                    raise InvalidArgument("The line item price was set for a fixed price item")
                # other case (not fixed_price and not item_price) is implicitly checked with the database constraints,
                # pydantic constraints and previous test
                price = product.price
                if not product.fixed_price:
                    price = item_price
                    item_quantity = 1

                if price is None or item_quantity is None:
                    raise RuntimeError("invalid internal price state, should not happen")

                # check age restriction
                if customer_restrictions is not None and customer_restrictions in product.restrictions:
                    restricted_products.add(product_id)

                line_items_by_product[product_id] = PendingLineItem(
                    quantity=item_quantity,
                    price=price,
                    tax_rate=product.tax_rate,
                    tax_name=product.tax_name,
                    product=product,
                )

        if len(restricted_products) > 0:
            raise AgeRestrictionException(restricted_products)

        return list(line_items_by_product.values())

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def check_order(self, *, conn: asyncpg.Connection, new_order: NewOrder) -> PendingOrder:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        customer = await conn.fetchrow(
            "select a.*, t.restriction from user_tag t join account a on t.uid = a.user_tag_uid where t.uid=$1",
            new_order.customer_tag_uid,
        )
        if customer is None:
            raise NotFound(element_typ="customer", element_id=str(new_order.customer_tag_uid))
        customer_account = Account.parse_obj(customer)

        line_items = await self._preprocess_order_positions(
            conn=conn, customer_restrictions=customer_account.restriction, positions=new_order.positions
        )

        order = PendingOrder(
            order_type=new_order.order_type,
            old_balance=customer_account.balance,
            new_balance=customer_account.balance,  # will be overwritten later on
            old_voucher_balance=customer_account.vouchers,
            new_voucher_balance=customer_account.vouchers,  # will be overwritten later on
            line_items=line_items,
            customer_account_id=customer_account.id,
        )

        # check order type specific requirements
        if new_order.order_type == OrderType.sale:
            vouchers_to_use = customer_account.vouchers
            if new_order.used_vouchers is not None:
                if new_order.used_vouchers > customer_account.vouchers:
                    raise NotEnoughVouchersException(available_vouchers=customer_account.vouchers)
                vouchers_to_use = new_order.used_vouchers
            discount_product = await self._fetch_discount_product(conn=conn)
            voucher_usage = self.voucher_service.compute_optimal_voucher_usage(
                max_vouchers=vouchers_to_use, line_items=order.line_items, discount_product=discount_product
            )

            order.new_voucher_balance = customer_account.vouchers - voucher_usage.used_vouchers
            order.line_items.extend(voucher_usage.additional_line_items)

            if customer_account.balance < order.total_price:
                raise NotEnoughFundsException(needed_fund=order.total_price, available_fund=customer_account.balance)
            order.new_balance = customer_account.balance - order.total_price

        elif new_order.order_type == OrderType.topup_sumup or new_order.order_type == OrderType.topup_cash:
            if len(new_order.positions) != 1:
                raise InvalidArgument("A topup Order must have exactly one position")
            if order.line_items[0].price < 0:
                raise InvalidArgument("A topup Order must have positive price")
            order.new_balance = customer_account.balance + order.total_price

        else:
            raise NotImplementedError()

        return order

    @staticmethod
    async def _fetch_account(conn: asyncpg.Connection, account_id: int) -> Optional[Account]:
        account = await conn.fetchrow(
            "select * from account where id=$1",
            account_id,
        )
        if account is None:
            return None
        return Account.parse_obj(account)

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def book_order(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, new_order: NewOrder
    ) -> CompletedOrder:
        """
        apply the order after all payment has been settled.
        """
        pending_order = await self.check_order(  # pylint: disable=unexpected-keyword-arg
            conn=conn,
            current_terminal=current_terminal,
            current_user=current_user,
            new_order=new_order,
        )

        order_row = await conn.fetchrow(
            "insert into ordr (uuid, item_count, order_type, cashier_id, till_id, customer_account_id) "
            "values ($1, $2, $3, $4, $5, $6) "
            "returning id, uuid, booked_at",
            new_order.uuid or uuid.uuid4(),
            len(pending_order.line_items),
            pending_order.order_type.name,
            current_user.id,
            current_terminal.till.id,
            pending_order.customer_account_id,
        )
        order_id = order_row["id"]
        order_uuid = order_row["uuid"]
        booked_at = order_row["booked_at"]

        for item_id, line_item in enumerate(pending_order.line_items):
            await conn.execute(
                "insert into line_item (order_id, item_id, product_id, quantity, price, tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                item_id,
                line_item.product.id,
                line_item.quantity,
                line_item.price,
                line_item.tax_name,
                line_item.tax_rate,
            )

        completed_order = CompletedOrder(
            id=order_id,
            uuid=order_uuid,
            order_type=pending_order.order_type,
            old_balance=pending_order.old_balance,
            new_balance=pending_order.new_balance,
            old_voucher_balance=pending_order.old_voucher_balance,
            new_voucher_balance=pending_order.new_voucher_balance,
            customer_account_id=pending_order.customer_account_id,
            line_items=pending_order.line_items,
            booked_at=booked_at,
            till_id=current_terminal.till.id,
            cashier_id=current_user.id,
        )

        # NOW book the order, or fail
        if pending_order.order_type == OrderType.sale:
            await self._book_sale_order(
                conn=conn, order=completed_order, customer_account_id=pending_order.customer_account_id
            )
        elif pending_order.order_type == OrderType.topup_cash:
            await self._book_topup_cash_order(
                conn=conn,
                order=completed_order,
                customer_account_id=pending_order.customer_account_id,
                cashier=current_user,
            )
        elif pending_order.order_type == OrderType.topup_sumup:
            await self._book_topup_sumup_order(
                conn=conn, order=completed_order, customer_account_id=pending_order.customer_account_id
            )
        else:
            raise NotImplementedError()

        await self._finish_order(conn=conn, order=completed_order)

        customer_account_after_booking = await self._fetch_account(
            conn=conn, account_id=completed_order.customer_account_id
        )
        if customer_account_after_booking is None:
            raise RuntimeError("customer was deleted unexpectedly, this should not happen")

        # adjust completed order values after real booking in database
        completed_order.new_balance = customer_account_after_booking.balance
        completed_order.new_voucher_balance = customer_account_after_booking.vouchers

        return completed_order

    async def _book_sale_order(self, *, conn: asyncpg.Connection, order: CompletedOrder, customer_account_id: int):
        """
        The customer wants to buy same wares, like Beer.
        It is checked if enough funds are available and books the results
        """
        assert order.order_type == OrderType.sale

        # combine booking based on (source, target, tax) -> amount
        prepared_bookings: Dict[BookingIdentifier, float] = defaultdict(lambda: 0.0)
        for line_item in order.line_items:
            product = line_item.product
            source_acc_id = get_source_account(OrderType.sale, product, customer_account_id)
            target_acc_id = get_target_account(OrderType.sale, product, customer_account_id)
            prepared_bookings[
                BookingIdentifier(source_account_id=source_acc_id, target_account_id=target_acc_id)
            ] += float(line_item.total_price)

        await self._book_prepared_bookings(conn=conn, order_id=order.id, bookings=prepared_bookings)

    async def _book_topup_cash_order(
        self, *, conn: asyncpg.Connection, order: CompletedOrder, customer_account_id: int, cashier: User
    ):
        """
        The customer pays cash money to get funds on hist customer account
        It books the money from the cash input to the current cashier's register and
        from the cash vault to the customer
        """
        assert order.order_type == OrderType.topup_cash
        assert cashier.cashier_account_id is not None
        assert len(order.line_items) == 1
        line_item = order.line_items[0]
        assert line_item.price >= 0

        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(source_account_id=ACCOUNT_CASH_VAULT, target_account_id=customer_account_id): float(
                line_item.total_price
            ),
            BookingIdentifier(
                source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=cashier.cashier_account_id
            ): float(line_item.total_price),
        }

        await self._book_prepared_bookings(conn=conn, order_id=order.id, bookings=prepared_bookings)

    async def _book_topup_sumup_order(
        self, *, conn: asyncpg.Connection, order: CompletedOrder, customer_account_id: int
    ):
        """
        The customer pays ec money (via sumup) to get funds on the customer account
        It books the money from the sumup input directlz to the customer
        """
        assert order.order_type == OrderType.topup_sumup
        assert len(order.line_items) == 1
        line_item = order.line_items[0]
        assert line_item.price >= 0

        prepared_bookings = {
            BookingIdentifier(source_account_id=ACCOUNT_SUMUP, target_account_id=customer_account_id): float(
                line_item.total_price
            )
        }

        await self._book_prepared_bookings(conn=conn, order_id=order.id, bookings=prepared_bookings)

    async def _book_prepared_bookings(
        self, conn: asyncpg.Connection, order_id: int, bookings: Dict[BookingIdentifier, float]
    ):
        """
        insert the selected bookings into the database.
        bookings are (source, target, tax) -> amount
        """
        for booking_identifier, amount in bookings.items():
            await conn.fetchval(
                "select * from book_transaction("
                "   order_id => $1,"
                "   description => $2,"
                "   source_account_id => $3,"
                "   target_account_id => $4,"
                "   amount => $5,"
                "   vouchers_amount => $6)",
                order_id,
                "",
                booking_identifier.source_account_id,
                booking_identifier.target_account_id,
                amount,
                0,  # TODO: add vouchers here
            )

    async def _finish_order(self, *, conn: asyncpg.Connection, order: CompletedOrder):
        """
        Once the order is executed properly, mark it as done and notify tse or bon service to process this order
        """
        # TODO first add a TSE signing request
        # The TSE signer should then call the code below to add the bon request
        # create bon request
        await conn.fetchval(
            "insert into bon(id) values ($1) ",  # TODO: this should be a trigger
            order.id,
        )
        await conn.execute("select pg_notify('bon', $1);", str(order.id))

    async def _fetch_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        """
        get all info about an order.
        """
        row = await conn.fetchrow("select * from order_value where id = $1", order_id)
        if row is None:
            return None

        return Order.parse_obj(row)

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def show_order(self, *, conn: asyncpg.Connection, current_user: User, order_id: int) -> Optional[Order]:
        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is not None and order.cashier_id == current_user.id:
            return order
        return None

    @with_db_transaction
    @requires_terminal([Privilege.cashier])
    async def list_orders_terminal(self, *, conn: asyncpg.Connection, current_user: User) -> list[Order]:
        cursor = conn.cursor("select * from order_value where ordr.cashier_id = $1", current_user.id)
        result = []
        async for row in cursor:
            result.append(Order.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
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
    @requires_user_privileges([Privilege.admin])
    async def list_orders_by_till(self, *, conn: asyncpg.Connection, till_id: int) -> list[Order]:
        cursor = conn.cursor("select * from order_value where till_id = $1", till_id)
        result = []
        async for row in cursor:
            result.append(Order.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        return await self._fetch_order(conn=conn, order_id=order_id)
