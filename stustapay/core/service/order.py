import json
import logging
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
from stustapay.core.schema.order import CompletedOrder, NewOrder, Order, OrderType, PendingOrder
from stustapay.core.schema.tax_rate import TAX_NONE
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, User
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbhook import DBHook
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_terminal, requires_user_privileges, with_db_transaction
from stustapay.core.service.common.error import InvalidArgument, NotFound, ServiceException
from stustapay.core.service.common.notifications import Subscription

logger = logging.getLogger(__name__)


@dataclass(eq=True, frozen=True)
class BookingIdentifier:
    source_account_id: int
    target_account_id: int
    tax_name: str


class NotEnoughFundsException(ServiceException):
    id = "NotEnoughFunds"
    description = "The customer has not enough funds on his account to complete the order"

    def __init__(self, needed_fund: float, available_fund: float):
        self.needed_fund = needed_fund
        self.available_fund = available_fund


class AgeRestrictionException(ServiceException):
    id = "AgeRestriction"
    description = "The customer is too young the buy the respective products"

    def __init__(self, product_ids: Set[int]):
        self.product_ids = product_ids


class AlreadyFinishedException(ServiceException):
    id = "AlreadyFinished"
    description = "The order cannot be booked, as it is not in pending state, and thus already finished or cancelled"

    def __init__(self, order_id):
        self.order_id = order_id


class OrderService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

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

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def create_order(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, current_user: User, new_order: NewOrder
    ) -> PendingOrder:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        customer = await conn.fetchrow(
            "select a.*, t.restriction from user_tag t join account a on t.uid = a.user_tag_uid where t.uid=$1",
            new_order.customer_tag,
        )
        if customer is None:
            raise NotFound(element_typ="customer", element_id=str(new_order.customer_tag))
        customer_account = Account.parse_obj(customer)

        order_id, order_uuid = await conn.fetchrow(
            "insert into ordr (status, order_type, cashier_id, till_id, customer_account_id) "
            "values ('pending', $1, $2, $3, $4) returning id, uuid",
            new_order.order_type.value,
            current_user.id,
            current_terminal.till.id,
            customer_account.id,
        )

        lineitem_count = 0
        restricted_products = set()
        for item in new_order.positions:
            product_id = item.product_id
            item_quantity = item.quantity
            item_price = item.price

            # check product cost
            cost = await conn.fetchrow(
                "select "
                "    product.price, "
                "    product.fixed_price, "
                "    tax.rate, "
                "    tax.name "
                "from product "
                "    left join tax on (tax.name = product.tax_name) "
                "where product.id = $1;",
                product_id,
            )
            if cost is None:
                raise NotFound(element_typ="product", element_id=str(product_id))
            price, fixed_price, tax_rate, tax_name = cost
            if fixed_price and item_price:
                raise InvalidArgument("The line item price was set for a fixed price item")
            # other case (not fixed_price and not item_price) is implicitly checked with the database constraints,
            # pydantic constraints and previous test
            if not fixed_price:
                price = item_price
                item_quantity = 1

            # check age restriction
            restricted = await conn.fetchval(
                "select * from product_restriction r join product p on r.id = p.id where r.restriction = $1",
                customer["restriction"],
            )
            if restricted:
                restricted_products.add(product_id)

            # add the line item
            await conn.fetchval(
                "insert into lineitem ("
                "    order_id, item_id, product_id, "
                "    quantity, price, "
                "    tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                lineitem_count,
                product_id,
                item_quantity,
                price,
                tax_name,
                tax_rate,
            )
            lineitem_count += 1

        if len(restricted_products) > 0:
            raise AgeRestrictionException(restricted_products)

        await conn.execute(
            "update ordr set itemcount = $1 where id = $2;",
            lineitem_count,
            order_id,
        )
        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise Exception("Order should have been created")

        # check order type specific requirements
        if new_order.order_type == OrderType.sale:
            if customer_account.balance < order.total_price:
                raise NotEnoughFundsException(needed_fund=order.total_price, available_fund=customer_account.balance)
            new_balance = customer_account.balance - order.total_price

        elif new_order.order_type == OrderType.topup_sumup or new_order.order_type == OrderType.topup_cash:
            if len(new_order.positions) != 1:
                raise InvalidArgument("A topup Order must have exactly one position")
            if order.line_items[0].price < 0:
                raise InvalidArgument("A topup Order must have positive price")
            new_balance = customer_account.balance + order.total_price

        else:
            raise NotImplementedError()

        return PendingOrder(
            id=order_id,
            uuid=order_uuid,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

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

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def book_order(
        self,
        *,
        conn: asyncpg.Connection,
        current_user: User,
        order_id: int,
    ) -> CompletedOrder:
        """
        apply the order after all payment has been settled.
        """
        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise NotFound(element_typ="order", element_id=str(order_id))

        if order.status != "pending":
            raise AlreadyFinishedException(order_id=order.id)

        customer = await conn.fetchrow(
            "select * from account where id=$1",
            order.customer_account_id,
        )
        if customer is None:
            # as the foreign key is enforced in the database, this should not happen
            raise NotFound(element_typ="customer", element_id=str(order.customer_account_id))
        customer_account = Account.parse_obj(customer)

        # NOW book the order, or fail
        if order.order_type == OrderType.sale:
            await self._book_sale_order(conn=conn, order=order, customer=customer_account)
        elif order.order_type == OrderType.topup_cash:
            await self._book_topup_cash_order(conn=conn, order=order, customer=customer_account, cashier=current_user)
        elif order.order_type == OrderType.topup_sumup:
            await self._book_topup_sumup_order(conn=conn, order=order, customer=customer_account)
        else:
            raise NotImplementedError()

        await self._finish_order(conn=conn, order=order)

        new_balance = await conn.fetchval("select balance from account where id = $1", customer_account.id)
        return CompletedOrder(
            id=order.id, uuid=order.uuid, old_balance=customer_account.balance, new_balance=new_balance
        )

    async def _book_sale_order(self, *, conn: asyncpg.Connection, order: Order, customer: Account):
        """
        The customer wants to buy same wares, like Beer.
        It is checked if enough funds are available and books the results
        """
        assert order.order_type == OrderType.sale
        if customer.balance < order.total_price:
            raise NotEnoughFundsException(needed_fund=order.total_price, available_fund=customer.balance)

        # combine booking based on (source, target, tax) -> amount
        prepared_bookings: Dict[BookingIdentifier, float] = defaultdict(lambda: 0.0)
        for line_item in order.line_items:
            product = line_item.product
            source_acc_id = get_source_account(OrderType.sale, product, customer.id)
            target_acc_id = get_target_account(OrderType.sale, product, customer.id)
            prepared_bookings[
                BookingIdentifier(
                    source_account_id=source_acc_id, target_account_id=target_acc_id, tax_name=line_item.tax_name
                )
            ] += float(line_item.total_price)

        await self._book_prepared_bookings(conn=conn, order_id=order.id, bookings=prepared_bookings)

    async def _book_topup_cash_order(self, *, conn: asyncpg.Connection, order: Order, customer: Account, cashier: User):
        """
        The customer pays cash money to get funds on hist customer account
        It books the money from the cash input to the current cashier's register and
        from the cash vault to the customer
        """
        assert order.order_type == OrderType.topup_cash
        assert cashier.cashier_account_id is not None
        assert order.itemcount == len(order.line_items) == 1
        line_item = order.line_items[0]
        assert line_item.price >= 0

        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=ACCOUNT_CASH_VAULT, target_account_id=customer.id, tax_name=line_item.tax_name
            ): float(line_item.total_price),
            BookingIdentifier(
                source_account_id=ACCOUNT_CASH_ENTRY, target_account_id=cashier.cashier_account_id, tax_name=TAX_NONE
            ): float(line_item.total_price),
        }

        await self._book_prepared_bookings(conn=conn, order_id=order.id, bookings=prepared_bookings)

    async def _book_topup_sumup_order(self, *, conn: asyncpg.Connection, order: Order, customer: Account):
        """
        The customer pays ec money (via sumup) to get funds on the customer account
        It books the money from the sumup input directlz to the customer
        """
        assert order.order_type == OrderType.topup_sumup
        assert order.itemcount == len(order.line_items) == 1
        line_item = order.line_items[0]
        assert line_item.price >= 0

        prepared_bookings = {
            BookingIdentifier(
                source_account_id=ACCOUNT_SUMUP, target_account_id=customer.id, tax_name=line_item.tax_name
            ): float(line_item.total_price)
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
                "   tax_name => $6,"
                "   vouchers => $7)",
                order_id,
                "",
                booking_identifier.source_account_id,
                booking_identifier.target_account_id,
                amount,
                booking_identifier.tax_name,
                0,  # TODO: add vouchers here
            )

    async def _finish_order(self, *, conn: asyncpg.Connection, order: Order):
        """
        Once the order is executed properly, mark it as done and notify tse or bon service to process this order
        """
        # mark the order as done
        await conn.fetchval(
            "update ordr set finished_at = now(),  status = 'done' where id = $1;",
            order.id,
        )

        # TODO first add a TSE signing request
        # The TSE signer should then call the code below to add the bon request
        # create bon request
        await conn.fetchval(
            "insert into bon(id) values($1) ",
            order.id,
        )
        await conn.execute("select pg_notify('bon', $1);", str(order.id))

    @with_db_transaction
    @requires_terminal(user_privileges=[Privilege.cashier])
    async def cancel_order(self, *, conn: asyncpg.Connection, order_id: int):
        """
        Cancel a Pending order
        """

        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise NotFound(element_typ="order", element_id=str(order_id))
        if order.status != "pending":
            raise AlreadyFinishedException(order_id=order.id)

        # mark the order as cancelled
        await conn.fetchval(
            "update ordr set finished_at = now(), status = 'cancelled' where id = $1;",
            order_id,
        )
