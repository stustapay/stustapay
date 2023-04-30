# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

from stustapay.core.schema.order import NewSale, Button, NewTopUp, TopUpType
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile, NewTillButton
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.order import OrderService, NotEnoughVouchersException
from stustapay.core.service.product import ProductService
from .common import BaseTestCase
from ..core.service.order.order import TillPermissionException, InvalidSaleException
from ..core.service.till import TillService

START_BALANCE = 100


class OrderLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.till_service = TillService(db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service)
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
        self.beer_button = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Helles 0,5l", product_ids=[self.beer_product.id, self.deposit_product.id]),
        )
        self.deposit_button = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Pfand", product_ids=[self.deposit_product.id]),
        )
        cashier_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning uid")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="test_cashier",
                description="",
                privileges=[Privilege.cashier],
                user_tag_uid=cashier_tag_uid,
                display_name="Test Cashier",
            )
        )
        self.till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(name="layout1", description="", button_ids=None),
        )
        self.till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile1", description="", layout_id=self.till_layout.id, allow_top_up=True, allow_cash_out=True
            ),
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

    async def test_basic_sale_flow(self):
        customer_acc = await self.till_service.get_customer(
            token=self.terminal_token, customer_tag_uid=self.customer_uid
        )
        self.assertIsNotNone(customer_acc)
        starting_balance = customer_acc.balance
        new_sale = NewSale(
            buttons=[Button(till_button_id=self.beer_button.id, quantity=2)],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_balance, START_BALANCE)
        self.assertEqual(pending_sale.item_count, 2)
        self.assertEqual(len(pending_sale.line_items), 2)
        self.assertEqual(pending_sale.total_price, 2 * self.beer_product.price + 2 * self.deposit_product.price)
        self.assertEqual(pending_sale.new_balance, START_BALANCE - pending_sale.total_price)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)
        order = await self.order_service.get_order(token=self.admin_token, order_id=completed_sale.id)
        self.assertIsNotNone(order)

        # test that we can cancel this order
        success = await self.order_service.cancel_sale(token=self.terminal_token, order_id=order.id)
        self.assertTrue(success)
        customer_acc = await self.till_service.get_customer(
            token=self.terminal_token, customer_tag_uid=self.customer_uid
        )
        self.assertIsNotNone(customer_acc)
        self.assertEqual(starting_balance, customer_acc.balance)

    async def test_returnable_products(self):
        new_sale = NewSale(
            buttons=[Button(till_button_id=self.beer_button.id, quantity=-1)],
            customer_tag_uid=self.customer_uid,
        )
        with self.assertRaises(InvalidSaleException):
            await self.order_service.check_sale(
                token=self.terminal_token,
                new_sale=new_sale,
            )

        new_sale = NewSale(
            buttons=[Button(till_button_id=self.deposit_button.id, quantity=-1)],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.total_price, -self.deposit_product.price)

    async def test_basic_sale_flow_with_deposit(self):
        new_sale = NewSale(
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
                Button(till_button_id=self.beer_button.id, quantity=2),
                Button(till_button_id=self.deposit_button.id, quantity=-1),
                Button(till_button_id=self.deposit_button.id, quantity=-1),
                Button(till_button_id=self.deposit_button.id, quantity=-2),
            ],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_balance, START_BALANCE)
        # our initial order gets aggregated into one line item for beer and one for deposit
        self.assertEqual(len(pending_sale.line_items), 2)
        self.assertEqual(pending_sale.total_price, 5 * self.beer_product.price + self.deposit_product.price)
        self.assertEqual(pending_sale.new_balance, START_BALANCE - pending_sale.total_price)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

    async def test_basic_sale_flow_with_only_deposit_return(self):
        new_sale = NewSale(
            buttons=[
                Button(till_button_id=self.deposit_button.id, quantity=-1),
                Button(till_button_id=self.deposit_button.id, quantity=-2),
            ],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_balance, START_BALANCE)
        # our initial order gets aggregated into one line item for beer and one for deposit
        self.assertEqual(len(pending_sale.line_items), 1)
        self.assertEqual(pending_sale.total_price, -3 * self.deposit_product.price)
        self.assertEqual(pending_sale.new_balance, START_BALANCE - pending_sale.total_price)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

    async def test_basic_sale_flow_with_vouchers(self):
        customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance, vouchers) values ($1, 'private', $2, $3);",
            customer_uid,
            100,
            3,
        )
        new_sale = NewSale(
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
            ],
            customer_tag_uid=customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_balance, 100)
        self.assertEqual(pending_sale.new_balance, 100 - self.deposit_product.price * 3)
        self.assertEqual(pending_sale.item_count, 3)  # rabatt + bier + pfand
        self.assertEqual(len(pending_sale.line_items), 3)
        self.assertEqual(pending_sale.old_voucher_balance, 3)
        self.assertEqual(pending_sale.new_voucher_balance, 0)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

    async def test_basic_sale_flow_with_fixed_vouchers(self):
        customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance, vouchers) values ($1, 'private', $2, $3);",
            customer_uid,
            100,
            3,
        )
        new_sale = NewSale(
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
            ],
            customer_tag_uid=customer_uid,
            used_vouchers=4,
        )
        with self.assertRaises(NotEnoughVouchersException):
            await self.order_service.check_sale(
                token=self.terminal_token,
                new_sale=new_sale,
            )
        new_sale.used_vouchers = 2
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_voucher_balance, 3)
        self.assertEqual(pending_sale.new_voucher_balance, 1)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

    async def test_only_topup_till_profiles_can_topup(self):
        profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile2", description="", layout_id=self.till_layout.id, allow_top_up=False, allow_cash_out=False
            ),
        )
        self.till.active_profile_id = profile.id
        await self.till_service.update_till(token=self.admin_token, till_id=self.till.id, till=self.till)

        with self.assertRaises(TillPermissionException):
            new_topup = NewTopUp(
                amount=20,
                topup_type=TopUpType.cash,
                customer_tag_uid=self.customer_uid,
            )
            await self.order_service.check_topup(token=self.terminal_token, new_topup=new_topup)

    async def test_topup_cash_order_flow(self):
        new_topup = NewTopUp(
            amount=20,
            topup_type=TopUpType.cash,
            customer_tag_uid=self.customer_uid,
        )
        pending_top_up = await self.order_service.check_topup(token=self.terminal_token, new_topup=new_topup)
        self.assertEqual(pending_top_up.old_balance, START_BALANCE)
        self.assertEqual(pending_top_up.amount, 20)
        self.assertEqual(pending_top_up.new_balance, START_BALANCE + pending_top_up.amount)
        completed_topup = await self.order_service.book_topup(token=self.terminal_token, new_topup=new_topup)
        self.assertIsNotNone(completed_topup)
        # todo check cashier account balance

    async def test_topup_sumup_order_flow(self):
        new_topup = NewTopUp(
            uuid=uuid.uuid4(),
            amount=20,
            topup_type=TopUpType.sumup,
            customer_tag_uid=self.customer_uid,
        )
        pending_topup = await self.order_service.check_topup(
            token=self.terminal_token,
            new_topup=new_topup,
        )
        self.assertEqual(pending_topup.old_balance, START_BALANCE)
        self.assertEqual(pending_topup.amount, 20)
        self.assertEqual(pending_topup.new_balance, START_BALANCE + pending_topup.amount)
        completed_topup = await self.order_service.book_topup(token=self.terminal_token, new_topup=new_topup)
        self.assertIsNotNone(completed_topup)
        self.assertEqual(completed_topup.uuid, new_topup.uuid)
        # todo check cashier account balance
