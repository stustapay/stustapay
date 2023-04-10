# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

from stustapay.core.schema.order import NewLineItem, NewOrder, OrderType
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.order import OrderService, NotEnoughVouchersException
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

        self.beer_product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Helles 0,5l",
                price=3,
                fixed_price=True,
                tax_name="ust",
                target_account_id=None,
                price_in_vouchers=1,
                is_locked=True,
            ),
        )
        self.deposit_product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Pfand",
                price=2,
                fixed_price=True,
                tax_name="none",
                target_account_id=None,
                is_locked=True,
                is_returnable=True,
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
        cashier_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning uid")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="test_cashier", description="", privileges=[Privilege.cashier], user_tag_uid=cashier_tag_uid
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
        self.customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (1234) returning uid")
        await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance) values ($1, 'private', $2);",
            self.customer_uid,
            START_BALANCE,
        )

        # fetch new till
        self.till = await self.till_service.get_till(token=self.admin_token, till_id=self.till.id)

    async def test_basic_order_flow(self):
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.beer_product.id, quantity=2)],
            order_type=OrderType.sale,
            customer_tag_uid=self.customer_uid,
        )
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_balance, START_BALANCE)
        self.assertEqual(pending_order.item_count, 1)
        self.assertEqual(len(pending_order.line_items), 1)
        self.assertEqual(pending_order.line_items[0].quantity, 2)
        self.assertEqual(pending_order.total_price, 2 * self.beer_product.price)
        self.assertEqual(pending_order.new_balance, START_BALANCE - pending_order.total_price)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)

    async def test_basic_order_flow_with_deposit(self):
        new_order = NewOrder(
            positions=[
                NewLineItem(product_id=self.beer_product.id, quantity=1),
                NewLineItem(product_id=self.beer_product.id, quantity=1),
                NewLineItem(product_id=self.deposit_product.id, quantity=1),
                NewLineItem(product_id=self.deposit_product.id, quantity=1),
                NewLineItem(product_id=self.deposit_product.id, quantity=-1),
            ],
            order_type=OrderType.sale,
            customer_tag_uid=self.customer_uid,
        )
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_balance, START_BALANCE)
        # our initial order gets aggregated into one line item for beer and one for deposit
        self.assertEqual(len(pending_order.line_items), 2)
        self.assertEqual(pending_order.total_price, 2 * self.beer_product.price + self.deposit_product.price)
        self.assertEqual(pending_order.new_balance, START_BALANCE - pending_order.total_price)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)

    async def test_basic_order_flow_with_only_deposit_return(self):
        new_order = NewOrder(
            positions=[
                NewLineItem(product_id=self.deposit_product.id, quantity=-3),
            ],
            order_type=OrderType.sale,
            customer_tag_uid=self.customer_uid,
        )
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_balance, START_BALANCE)
        # our initial order gets aggregated into one line item for beer and one for deposit
        self.assertEqual(len(pending_order.line_items), 1)
        self.assertEqual(pending_order.total_price, -3 * self.deposit_product.price)
        self.assertEqual(pending_order.new_balance, START_BALANCE - pending_order.total_price)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)

    async def test_basic_order_flow_with_vouchers(self):
        customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance, vouchers) values ($1, 'private', $2, $3);",
            customer_uid,
            100,
            3,
        )
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.beer_product.id, quantity=3)],
            order_type=OrderType.sale,
            customer_tag_uid=customer_uid,
        )
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_balance, 100)
        self.assertEqual(pending_order.item_count, 2)
        self.assertEqual(len(pending_order.line_items), 2)
        self.assertEqual(pending_order.new_voucher_balance, 0)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)

    async def test_basic_order_flow_with_uuid(self):
        uid = uuid.uuid4()
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.beer_product.id, quantity=2)],
            order_type=OrderType.sale,
            customer_tag_uid=self.customer_uid,
            uuid=uid,
        )
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertEqual(completed_order.uuid, uid)

    async def test_basic_order_flow_with_fixed_vouchers(self):
        customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance, vouchers) values ($1, 'private', $2, $3);",
            customer_uid,
            100,
            3,
        )
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.beer_product.id, quantity=3)],
            order_type=OrderType.sale,
            customer_tag_uid=customer_uid,
            used_vouchers=4,
        )
        with self.assertRaises(NotEnoughVouchersException):
            await self.order_service.check_order(
                token=self.terminal_token,
                new_order=new_order,
            )
        new_order.used_vouchers = 2
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_voucher_balance, 3)
        self.assertEqual(pending_order.new_voucher_balance, 1)

    async def test_topup_cash_order_flow(self):
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.topup_product.id, price=20)],
            order_type=OrderType.topup_cash,
            customer_tag_uid=self.customer_uid,
        )
        pending_order = await self.order_service.check_order(token=self.terminal_token, new_order=new_order)
        self.assertEqual(pending_order.old_balance, START_BALANCE)
        self.assertEqual(pending_order.item_count, 1)
        self.assertEqual(len(pending_order.line_items), 1)
        self.assertEqual(pending_order.line_items[0].quantity, 1)
        self.assertEqual(pending_order.line_items[0].price, 20)
        self.assertEqual(pending_order.total_price, 20)
        self.assertEqual(pending_order.new_balance, START_BALANCE + pending_order.total_price)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)
        # todo check cashier account balance

    async def test_topup_sumup_order_flow(self):
        new_order = NewOrder(
            positions=[NewLineItem(product_id=self.topup_product.id, price=20)],
            order_type=OrderType.topup_sumup,
            customer_tag_uid=self.customer_uid,
        )
        pending_order = await self.order_service.check_order(
            token=self.terminal_token,
            new_order=new_order,
        )
        self.assertEqual(pending_order.old_balance, START_BALANCE)
        self.assertEqual(pending_order.line_items[0].quantity, 1)
        self.assertEqual(pending_order.line_items[0].price, 20)
        self.assertEqual(pending_order.total_price, 20)
        self.assertEqual(pending_order.new_balance, START_BALANCE + pending_order.total_price)
        completed_order = await self.order_service.book_order(token=self.terminal_token, new_order=new_order)
        self.assertIsNotNone(completed_order)
        # todo check cashier account balance
