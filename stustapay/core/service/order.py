import logging
from typing import Optional

import asyncpg

from stustapay.core.schema.order import LineItem, NewOrder, Order, OrderID
from stustapay.core.schema.terminal import Terminal
from stustapay.core.schema.user import Privilege, User
from .dbservice import DBService, requires_user_privileges, with_db_transaction

logger = logging.getLogger(__name__)


class OrderService(DBService):
    @with_db_transaction
    @requires_user_privileges([Privilege.cashier])
    async def create_order(
        self, *, conn: asyncpg.Connection, current_user: User, current_terminal: Terminal, order: NewOrder
    ) -> OrderID:
        order_id: int = await conn.fetchval(
            "insert into ordr (status, cashier_id, terminal_id) values ('pending', $1, $2) returning id",
            current_user.id,
            current_terminal.id,
        )

        count = 0
        for item in order.positions:
            item_id = item.product_id
            item_quantity = item.quantity

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
                raise Exception("product not found")

            price, tax_rate, tax_name = cost

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

        return OrderID(order_id)

    @with_db_transaction
    async def show_order(self, *, conn: asyncpg.Connection, order_id: int) -> Optional[Order]:
        """
        get all info about an order.
        """
        row = await conn.fetchrow("select * from order_value where id = $1", order_id)
        if row is None:
            return None

        db_line_items = await conn.fetch(
            "select * from lineitem join product on product_id = id where order_id = $1", order_id
        )
        line_items = [LineItem.from_db(row) for row in db_line_items]
        return Order.from_db(row, line_items)

    @with_db_transaction
    async def order_payment_info(self, *, conn: asyncpg.Connection, order_id: int):
        """
        try to pay a pending order, so one can see the available payment options.
        """
        del order_id, conn
        raise NotImplementedError()

    @with_db_transaction
    async def book_order(
        self,
        *,
        conn: asyncpg.Connection,
        order_id: int,
        customer_account_id: int,
    ):
        """
        apply the order after all payment has been settled.
        """
        status: Optional[str] = await conn.fetchval(
            "select status from ordr where id = $1;",
            order_id,
        )

        if status is None:
            raise Exception("order not found")

        if status != "pending":
            raise Exception("order not in pending state")

        # TODO create transactions accordingly and call 'select book_transaction()' in the database
        # sufficent funds are not checked in the database
        # current available funds of source

        # mark the order as done
        await conn.fetchval(
            "update ordr set finished_at = now(),  status = 'done' , customer_account_id = $2 where id = $1;",
            order_id,
            customer_account_id,
        )

        # TODO first add a TSE signing request
        # The TSE signer should then call the code below to add the bon request
        # create bon request
        await conn.fetchval(
            "insert into bon(id) values($1) "
            "on conflict do"
            "    update set generated = false, "
            "               generated_at = null, "
            "               status = null "
            "    where id = $1;",
            order_id,
        )
        await conn.execute("select pg_notify('bon', $1);", order_id)

    @with_db_transaction
    async def cancel_order(self, *, conn: asyncpg.Connection, order_id: int):
        status: Optional[str] = await conn.fetchval(
            "select status from ordr where id = $1;",
            order_id,
        )

        if status is None:
            raise Exception("order not found")

        if status != "pending":
            raise Exception("order not in pending state")

        # mark the order as cancelled
        await conn.fetchval(
            "update ordr set finished_at = now(), status = 'cancelled' where id = $1;",
            order_id,
        )
