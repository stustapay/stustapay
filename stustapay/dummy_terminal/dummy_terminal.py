# pylint: disable=unexpected-keyword-arg,missing-kwoa
import asyncio
import logging
import random

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.order import NewLineItem, NewOrder, OrderType
from stustapay.core.schema.till import TillButton
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import with_db_connection
from stustapay.core.service.order import NotEnoughFundsException, OrderService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService


class DummyTerminal:
    def __init__(self, config: Config, db_pool: asyncpg.Pool):
        self.logger = logging.getLogger(__name__)
        self.config = config
        self.db_pool = db_pool

        self.auth_service = AuthService(config=self.config, db_pool=self.db_pool)
        self.user_service = UserService(config=self.config, db_pool=self.db_pool, auth_service=self.auth_service)
        self.till_service = TillService(config=self.config, db_pool=self.db_pool, auth_service=self.auth_service)
        self.order_service = OrderService(config=self.config, db_pool=self.db_pool, auth_service=self.auth_service)

        self.min_interval_between_orders = 0.0001
        self.max_interval_between_orders = 0.001

        self.min_interval_before_finishing_order = 0.0001
        self.max_interval_before_finishing_order = 0.0002

    async def run(self):
        try:
            async with self.db_pool.acquire() as conn:
                await self._run(conn)
        finally:
            await self.db_pool.close()

    @staticmethod
    def select_random_products_from_buttons(buttons: list[TillButton]) -> list[int]:
        button = random.choice(buttons)
        return button.product_ids

    @staticmethod
    async def select_random_customer_tag(conn: asyncpg.Connection) -> int:
        async with conn.transaction():
            cur = conn.cursor("select * from user_tag")
            tags = []
            async for row in cur:
                tags.append(row["uid"])
            return random.choice(tags)

    @with_db_connection
    async def _run(self, conn: asyncpg.Connection):
        self.logger.info("Starting dummy terminal")
        login_result = await self.user_service.login_user(username="admin", password="admin")
        admin_token = login_result.token

        await self.till_service.logout_terminal_id(token=admin_token, till_id=0)
        till = await self.till_service.get_till(token=admin_token, till_id=0)
        registration_result = await self.till_service.register_terminal(registration_uuid=till.registration_uuid)
        terminal_token = registration_result.token
        terminal_config = await self.till_service.get_terminal_config(token=terminal_token)
        till.active_user_id = 0
        await self.till_service.update_till(token=admin_token, till_id=till.id, till=till)

        self.logger.info("Starting to create orders indefinitely")
        while True:
            await asyncio.sleep(random.uniform(self.min_interval_between_orders, self.max_interval_between_orders))

            products_to_book = self.select_random_products_from_buttons(terminal_config.buttons)
            customer_tag = await self.select_random_customer_tag(conn)
            line_items = [NewLineItem(product_id=product_id, quantity=1) for product_id in products_to_book]
            new_order = NewOrder(order_type=OrderType.sale, customer_tag=customer_tag, positions=line_items)
            self.logger.info(f"Creating order {new_order}")
            try:
                order = await self.order_service.create_order(
                    token=terminal_token,
                    new_order=new_order,
                )
            except NotEnoughFundsException as e:
                self.logger.info(f"not enough funds: {e}")
                continue
            await asyncio.sleep(
                random.uniform(self.min_interval_before_finishing_order, self.max_interval_before_finishing_order)
            )
            should_book = random.random() >= 0.1
            if should_book:
                self.logger.info("Booking order")
                await self.order_service.book_order(token=terminal_token, order_id=order.id)
            else:
                self.logger.info("Cancelling order")
                await self.order_service.cancel_order(token=terminal_token, order_id=order.id)
