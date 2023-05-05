# pylint: disable=unexpected-keyword-arg,missing-kwoa
import asyncio
import logging
import random

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.order import Button, NewSale
from stustapay.core.schema.terminal import TerminalButton
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
        self.till_service = TillService(
            config=self.config,
            db_pool=self.db_pool,
            auth_service=self.auth_service,
        )
        self.order_service = OrderService(
            config=self.config,
            db_pool=self.db_pool,
            auth_service=self.auth_service,
        )

        self.min_interval_between_orders = 0.0001
        self.max_interval_between_orders = 0.001

        self.min_interval_before_finishing_order = 0.0001
        self.max_interval_before_finishing_order = 0.0002

    async def run(self):
        try:
            await self._run()  # pylint: disable=no-value-for-parameter
        finally:
            await self.db_pool.close()

    @staticmethod
    def press_random_buttons(buttons: list[TerminalButton]) -> list[Button]:
        selected_buttons = random.choices(buttons, k=random.randint(1, len(buttons)))
        pressed_buttons = []
        for b in selected_buttons:
            pressed_buttons.append(Button(till_button_id=b.id, quantity=random.randint(1, 4)))
        return pressed_buttons

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

            pressed_buttons = self.press_random_buttons(terminal_config.buttons)
            customer_tag_uid = await self.select_random_customer_tag(conn)
            new_sale = NewSale(customer_tag_uid=customer_tag_uid, buttons=pressed_buttons)
            self.logger.info(f"Creating sale {new_sale}")
            try:
                order = await self.order_service.book_sale(
                    token=terminal_token,
                    new_sale=new_sale,
                )
                print(order)
            except NotEnoughFundsException as e:
                self.logger.info(f"not enough funds: {e}")
                continue
            await asyncio.sleep(
                random.uniform(self.min_interval_before_finishing_order, self.max_interval_before_finishing_order)
            )
