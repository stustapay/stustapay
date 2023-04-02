# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.order import NewLineItem, NewOrder, OrderType
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from .common import BaseTestCase

START_BALANCE = 100


class OrderLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.order_service = OrderService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
        )

        self.product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Test Product",
                price=3,
                fixed_price=True,
                tax_name="ust",
                target_account_id=None,
            ),
        )
        self.topup_product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Top Up",
                price=None,
                fixed_price=False,
                tax_name="none",
                target_account_id=None,
            ),
        )
        cashier_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning id")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="test_cashier", description="", privileges=[Privilege.cashier], user_tag_id=cashier_tag_id
            )
        )
        self.till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(name="layout1", description="", button_ids=None),
        )
        self.till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(name="profile1", description="", layout_id=self.till_layout.id, allow_top_up=False),
        )
        self.till = await self.till_service.create_till(
            token=self.admin_token,
            till=NewTill(
                name="test_till",
                description="",
                tse_id=None,
                active_shift=None,
                active_profile_id=self.till_profile.id,
                active_user_id=self.cashier.id,
            ),
        )
        # login in cashier to till
        self.terminal_token = (
            await self.till_service.register_terminal(registration_uuid=self.till.registration_uuid)
        ).token
        cashier_account_id = await self.db_conn.fetchval(
            "insert into account (type, balance) values ('internal', $1) returning id",
            0,
        )
        await self.user_service.link_user_to_cashier_account(
            token=self.admin_token, user_id=self.cashier.id, account_id=cashier_account_id
        )
        # add customer
        user_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (1234) returning id")
        await self.db_conn.fetchval(
            "insert into account (user_tag_id, type, balance) values ($1, 'private', $2);", user_tag_id, START_BALANCE
        )

        # fetch new till
        self.till = await self.till_service.get_till(token=self.admin_token, till_id=self.till.id)

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

    async def test_topup_cash_order_flow(self):
        completed_order = await self.order_service.create_order(
            token=self.terminal_token,
            new_order=NewOrder(
                positions=[NewLineItem(product_id=self.topup_product.id, price=20)],
                order_type=OrderType.topup_cash,
                customer_tag=1234,
            ),
        )
        self.assertEqual(completed_order.old_balance, START_BALANCE)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.itemcount, 1)
        self.assertEqual(len(order.line_items), 1)
        self.assertEqual(order.line_items[0].quantity, 1)
        self.assertEqual(order.line_items[0].price, 20)
        self.assertEqual(order.value_sum, 20)
        self.assertEqual(completed_order.new_balance, START_BALANCE + order.value_sum)
        await self.order_service.book_order(token=self.terminal_token, order_id=completed_order.id)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "done")
        # todo check cashier account balance

    async def test_topup_sumup_order_flow(self):
        completed_order = await self.order_service.create_order(
            token=self.terminal_token,
            new_order=NewOrder(
                positions=[NewLineItem(product_id=self.topup_product.id, price=20)],
                order_type=OrderType.topup_sumup,
                customer_tag=1234,
            ),
        )
        self.assertEqual(completed_order.old_balance, START_BALANCE)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.line_items[0].quantity, 1)
        self.assertEqual(order.line_items[0].price, 20)
        self.assertEqual(order.value_sum, 20)
        self.assertEqual(completed_order.new_balance, START_BALANCE + order.value_sum)
        await self.order_service.book_order(token=self.terminal_token, order_id=completed_order.id)
        order = await self.order_service.show_order(token=self.terminal_token, order_id=completed_order.id)
        self.assertEqual(order.status, "done")
        # todo check cashier account balance
