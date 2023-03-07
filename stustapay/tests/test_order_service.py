# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.order import NewLineItem, NewOrder, OrderType
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.terminal import NewTerminal, NewTerminalLayout, NewTerminalProfile
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.terminal import TerminalService
from .common import BaseTestCase

START_BALANCE = 100


class OrderLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.terminal_service = TerminalService(
            db_pool=self.db_pool, config=self.test_config, user_service=self.user_service
        )
        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, user_service=self.user_service
        )
        self.order_service = OrderService(
            db_pool=self.db_pool, config=self.test_config, terminal_service=self.terminal_service
        )

        self.product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Test Product",
                price=3,
                tax_name="ust",
                target_account_id=None,
            ),
        )
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(name="test_cashier", description="", privileges=[Privilege.cashier])
        )
        self.terminal_layout = await self.terminal_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTerminalLayout(name="layout1", description="", button_ids=None, allow_top_up=False),
        )
        self.terminal_profile = await self.terminal_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTerminalProfile(name="profile1", description="", layout_id=self.terminal_layout.id),
        )
        self.terminal = await self.terminal_service.create_terminal(
            token=self.admin_token,
            terminal=NewTerminal(
                name="test_terminal",
                description="",
                tse_id=None,
                active_shift=None,
                active_profile_id=self.terminal_profile.id,
                active_cashier_id=None,
            ),
        )
        # login in cashier to terminal
        self.terminal_token = (
            await self.terminal_service.register_terminal(registration_uuid=self.terminal.registration_uuid)
        ).token
        cashier_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning id")
        cashier_account_id = await self.db_conn.fetchval(
            "insert into account (user_tag_id, type, balance) values ($1, 'internal', $2) returning id",
            cashier_tag_id,
            0,
        )
        await self.user_service.link_user_to_account(
            token=self.admin_token, user_id=self.cashier.id, account_id=cashier_account_id
        )
        await self.terminal_service.login_cashier(token=self.terminal_token, tag_uid=54321)
        # add customer
        user_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (1234) returning id")
        await self.db_conn.fetchval(
            "insert into account (user_tag_id, type, balance) values ($1, 'private', $2);", user_tag_id, START_BALANCE
        )

        # fetch new terminal
        self.terminal = await self.terminal_service.get_terminal(token=self.admin_token, terminal_id=self.terminal.id)

    async def test_basic_order_flow(self):
        completed_order = await self.order_service.create_order(
            token=self.terminal_token,
            new_order=NewOrder(
                positions=[NewLineItem(product_id=self.product.id, quantity=2)],
                order_type=OrderType.sale,
                customer_tag=1234,
            ),
        )
        self.assertEqual(completed_order.old_balance, START_BALANCE)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.itemcount, 1)
        self.assertEqual(len(order.line_items), 1)
        self.assertEqual(order.line_items[0].quantity, 2)
        self.assertEqual(order.value_sum, 2 * self.product.price)
        self.assertEqual(completed_order.new_balance, START_BALANCE - order.value_sum)
        await self.order_service.book_order(token=self.terminal_token, order_id=completed_order.id)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "done")
