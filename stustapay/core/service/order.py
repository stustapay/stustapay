import logging
from collections import defaultdict
from typing import Dict, Optional, Tuple

import asyncpg
from fastapi import HTTPException
from starlette import status

from stustapay.core.schema.account import Account, get_source_account, get_target_account
from stustapay.core.schema.order import CompletedOrder, LineItem, NewOrder, ORDER_TYPE_SALE, Order
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, User
from stustapay.core.service.dbservice import DBService, requires_user_privileges, with_db_transaction

logger = logging.getLogger(__name__)


class OrderService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.cashier])
    async def execute_order(
        self, *, conn: asyncpg.Connection, current_user: User, current_terminal: Terminal, new_order: NewOrder
    ) -> CompletedOrder:
        """
        executes the given order: checks all requirements, determines the corresponding transactions and executes them
        """
        customer = await conn.fetchrow(
            "select a.*, t.restriction from user_tag t join account a on t.id = a.user_tag_id where t.uid=$1",
            new_order.customer_tag,
        )
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        customer_account = Account.from_db(customer)

        order_id, order_uuid = await conn.fetchrow(
            "insert into ordr (status, order_type, cashier_id, terminal_id, customer_account_id) "
            "values ('pending', $1, $2, $3, $4) returning id, uuid",
            new_order.order_type,
            current_user.id,
            current_terminal.id,
            customer_account.id,
        )

        count = 0
        for item in new_order.positions:
            item_id = item.product_id
            item_quantity = item.quantity

            # check product cost
            cost = await conn.fetchrow(
                "select "
                "    product.price, "
                "    tax.rate, "
                "    tax.name "
                "from product "
                "    left join tax on (tax.name = product.tax) "
                "where product.id = $1;",
                item_id,
            )
            if cost is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_id} not found")
            price, tax_rate, tax_name = cost

            # check age restriction
            restricted = await conn.fetchval(
                "select * from product_restriction r join product p on r.id = p.id where r.restriction = $1",
                customer["restriction"],
            )
            if restricted is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail=f"Product {item_id} is age restricted"
                )

            # add the line item
            await conn.fetchval(
                "insert into lineitem ("
                "    order_id, item_id, product_id, "
                "    quantity, price, "
                "    tax_name, tax_rate) "
                "values ($1, $2, $3, $4, $5, $6, $7)",
                order_id,
                count,
                item_id,
                item_quantity,
                price,
                tax_name,
                tax_rate,
            )
            count += 1

        await conn.execute(
            "update ordr set itemcount = $1 where id = $2;",
            count,
            order_id,
        )
        order = await self._fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # NOW book the order, or fail
        if new_order.order_type == ORDER_TYPE_SALE:
            await self._book_sale_order(conn=conn, order=order, customer=customer_account)
        else:
            raise NotImplementedError()

        await self._finish_order(conn=conn, order=order)

        new_balance = await conn.fetchval("select balance from account where id = $1", customer_account.id)
        return CompletedOrder(order_id, order_uuid, old_balance=customer_account.balance, new_balance=new_balance)

    async def _book_sale_order(self, *, conn: asyncpg.Connection, order: Order, customer: Account) -> float:
        """
        The customer wants to buy same wares, like Beer.
        It is checked if enough funds are available and books the results
        returns the new balance of the customer account
        """
        assert order.order_type == ORDER_TYPE_SALE
        if customer.balance < order.value_sum:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Not enough funds on customer account"
            )

        # enough funds are available, we can book the order now

        # combine booking based on (source, target, tax) -> amount

        prepared_bookings: Dict[Tuple[int, int, str], float] = defaultdict(lambda: 0.0)
        for line_item in order.line_items:
            product = line_item.product
            source_account_id = get_source_account(ORDER_TYPE_SALE, product, customer.id)
            target_account_id = get_target_account(ORDER_TYPE_SALE, product, customer.id)
            # only positive bookings are allowed, swap accounts if price is negative
            if product.price < 0:
                source_account_id, target_account_id = target_account_id, source_account_id
            prepared_bookings[(source_account_id, target_account_id, line_item.tax_name)] += line_item.total_price

        # execute the created bookings
        for (source_account_id, target_account_id, tax_name), amount in prepared_bookings.items():
            await conn.fetchval(
                "select * from book_transaction("
                "   order_id => $1,"
                "   description => $2,"
                "   source_account_id => $3,"
                "   target_account_id => $4,"
                "   amount => $5,"
                "   tax_name => $6)",
                order.id,
                "",
                source_account_id,
                target_account_id,
                amount,
                tax_name,
            )

        return await conn.fetchval("select balance from account where id = $1", customer.id)

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

    async def _fetch_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        """
        get all info about an order.
        """
        row = await conn.fetchrow("select * from order_value where id = $1", order_id)
        if row is None:
            return None

        db_line_items = await conn.fetch(
            "select * from lineitem_tax join product on product_id = id where order_id = $1", order_id
        )
        line_items = [LineItem.from_db(row) for row in db_line_items]
        return Order.from_db(row, line_items)

    @with_db_transaction
    async def show_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        return await self._fetch_order(conn=conn, order_id=order_id)

    @with_db_transaction
    async def cancel_order(self, *, conn: asyncpg.Connection, order_id: int):
        order_status: Optional[str] = await conn.fetchval(
            "select status from ordr where id = $1;",
            order_id,
        )

        if order_status is None:
            raise Exception("order not found")

        if order_status != "pending":
            raise Exception("order not in pending state")

        # mark the order as cancelled
        await conn.fetchval(
            "update ordr set finished_at = now(), status = 'cancelled' where id = $1;",
            order_id,
        )
