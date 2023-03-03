# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.order import NewLineItem, NewOrder, OrderType
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.terminal import NewTerminal, NewTerminalLayout, NewTerminalProfile
from stustapay.core.schema.user import Privilege, User, UserWithoutId
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.user import UserService
from .common import BaseTestCase

START_BALANCE = 100


class OrderLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.admin_user = User(id=1, name="test-user", description="", privileges=[Privilege.admin])
        self.user_service = UserService(db_pool=self.db_pool, config=self.test_config)
        self.terminal_service = TerminalService(db_pool=self.db_pool, config=self.test_config)
        self.product_service = ProductService(db_pool=self.db_pool, config=self.test_config)
        self.order_service = OrderService(db_pool=self.db_pool, config=self.test_config)

        self.product = await self.product_service.create_product(
            current_user=self.admin_user,
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
            current_user=self.admin_user, layout=NewTerminalLayout(name="layout1", description="", products=[])
        )
        self.terminal_profile = await self.terminal_service.profile.create_profile(
            current_user=self.admin_user,
            profile=NewTerminalProfile(name="profile1", description="", layout_id=self.terminal_layout.id),
        )
        self.terminal = await self.terminal_service.create_terminal(
            current_user=self.admin_user,
            terminal=NewTerminal(
                name="test_terminal",
                description="",
                tse_id=None,
                active_shift=None,
                active_profile_id=self.terminal_profile.id,
                active_cashier_id=None,
            ),
        )
        # add customer
        user_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (1234) returning id")
        await self.db_conn.fetchval(
            "insert into account (user_tag_id, type, balance) values ($1, 'private', $2);", user_tag_id, START_BALANCE
        )

    async def test_basic_order_flow(self):
        completed_order = await self.order_service.create_order(
            current_user=self.cashier,
            current_terminal=self.terminal,
            new_order=NewOrder(
                positions=[NewLineItem(product_id=self.product.id, quantity=2)],
                order_type=OrderType.sale,
                customer_tag=1234,
            ),
        )
        self.assertEqual(completed_order.old_balance, START_BALANCE)
        order = await self.order_service.show_order(order_id=completed_order.id)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.itemcount, 1)
        self.assertEqual(len(order.line_items), 1)
        self.assertEqual(order.line_items[0].quantity, 2)
        self.assertEqual(order.value_sum, 2 * self.product.price)
        self.assertEqual(completed_order.new_balance, START_BALANCE - order.value_sum)
        await self.order_service.book_order(order_id=completed_order.id)
        order = await self.order_service.show_order(order_id=completed_order.id)
        self.assertEqual(order.status, "done")
