# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

from stustapay.core.schema.account import (
    ACCOUNT_CASH_ENTRY,
    ACCOUNT_CASH_EXIT,
    ACCOUNT_CASH_SALE_SOURCE,
    ACCOUNT_DEPOSIT,
    ACCOUNT_SALE_EXIT,
    ACCOUNT_SUMUP,
)
from stustapay.core.schema.order import (
    Button,
    CompletedTicketSale,
    NewPayOut,
    NewSale,
    NewTicketSale,
    NewTicketScan,
    NewTopUp,
    Order,
    PaymentMethod,
    PendingSale,
)
from stustapay.core.schema.product import (
    TICKET_PRODUCT_ID,
    TICKET_U16_PRODUCT_ID,
    TICKET_U18_PRODUCT_ID,
    NewProduct,
    ProductRestriction,
)
from stustapay.core.schema.ticket import NewTicket
from stustapay.core.schema.till import (
    NewCashRegister,
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    ADMIN_ROLE_NAME,
    CASHIER_ROLE_ID,
    CASHIER_ROLE_NAME,
    FINANZORGA_ROLE_NAME,
    UserTag,
)
from stustapay.core.service.account import AccountService
from stustapay.core.service.order import NotEnoughVouchersException, OrderService
from stustapay.core.service.order.order import (
    InvalidSaleException,
    NotEnoughFundsException,
    TillPermissionException,
    fetch_max_account_balance,
)
from stustapay.core.service.product import ProductService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService

from ..core.service.common.error import InvalidArgument
from .common import TerminalTestCase

START_BALANCE = 100


class OrderLogicTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.till_service = TillService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
        )
        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.ticket_service = TicketService(
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
                restrictions=[],
                is_returnable=False,
            ),
        )
        self.beer_product_full = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Helles 1l",
                price=5,
                fixed_price=True,
                tax_name="ust",
                target_account_id=None,
                price_in_vouchers=2,
                is_locked=True,
                is_returnable=False,
                restrictions=[],
            ),
        )
        self.deposit_product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Pfand",
                price=2,
                fixed_price=True,
                tax_name="none",
                target_account_id=ACCOUNT_DEPOSIT,
                is_locked=True,
                is_returnable=True,
                restrictions=[],
            ),
        )
        self.beer_button = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Helles 0,5l", product_ids=[self.beer_product.id, self.deposit_product.id]),
        )
        self.beer_button_full = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Helles 1l", product_ids=[self.beer_product_full.id, self.deposit_product.id]),
        )
        self.deposit_button = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Pfand", product_ids=[self.deposit_product.id]),
        )
        self.ticket = await self.ticket_service.create_ticket(
            token=self.admin_token,
            ticket=NewTicket(name="Eintritt mit 8€", product_id=TICKET_PRODUCT_ID, initial_top_up_amount=8),
        )
        self.ticket_u18 = await self.ticket_service.create_ticket(
            token=self.admin_token,
            ticket=NewTicket(
                name="Eintritt U18",
                product_id=TICKET_U18_PRODUCT_ID,
                initial_top_up_amount=8,
                restriction=ProductRestriction.under_18,
            ),
        )
        self.ticket_u16 = await self.ticket_service.create_ticket(
            token=self.admin_token,
            ticket=NewTicket(
                name="Eintritt U16",
                product_id=TICKET_U16_PRODUCT_ID,
                initial_top_up_amount=0,
                restriction=ProductRestriction.under_16,
            ),
        )

        self.till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(
                name="layout1",
                description="",
                button_ids=[self.deposit_button.id, self.beer_button.id, self.beer_button_full.id],
                ticket_ids=[self.ticket.id, self.ticket_u18.id, self.ticket_u16.id],
            ),
        )
        self.till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile1",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        self.till = await self.till_service.update_till(
            token=self.admin_token,
            till_id=self.till.id,
            till=NewTill(
                name="test-till",
                active_profile_id=self.till_profile.id,
            ),
        )
        # add customer
        self.customer_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (1234) returning uid")
        self.customer_account_id = await self.db_conn.fetchval(
            "insert into account (user_tag_uid, type, balance) values ($1, 'private', $2) returning id",
            self.customer_uid,
            START_BALANCE,
        )

        self.cash_register = await self.till_service.register.create_cash_register(
            token=self.admin_token, new_register=NewCashRegister(name="Blechkasse 1")
        )
        self.register_stocking = await self.till_service.register.create_cash_register_stockings(
            token=self.admin_token, stocking=NewCashRegisterStocking(name="Blechkasse", euro100=3)
        )
        await self._login_supervised_user(user_tag_uid=self.admin_tag_uid, user_role_id=ADMIN_ROLE_ID)

        await self._login_supervised_user(user_tag_uid=self.cashier_tag_uid, user_role_id=CASHIER_ROLE_ID)

    async def test_basic_sale_flow(self):
        z_nr_start = await self.db_conn.fetchval("select z_nr from till where id = $1", self.till.id)
        customer_acc = await self.till_service.get_customer(
            token=self.terminal_token, customer_tag_uid=self.customer_uid
        )
        self.assertIsNotNone(customer_acc)
        starting_balance = customer_acc.balance
        new_sale = NewSale(
            uuid=uuid.uuid4(),
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
        order: Order = await self.order_service.get_order(token=self.admin_token, order_id=completed_sale.id)
        self.assertIsNotNone(order)
        await self._assert_account_balance(account_id=ACCOUNT_SALE_EXIT, expected_balance=2 * self.beer_product.price)
        await self._assert_account_balance(account_id=ACCOUNT_DEPOSIT, expected_balance=2 * self.deposit_product.price)

        # test that we can cancel this order
        await self.order_service.cancel_sale(token=self.terminal_token, order_id=order.id)
        customer = await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=self.customer_uid)
        self.assertIsNotNone(customer)
        self.assertEqual(starting_balance, customer.balance)
        await self._assert_account_balance(account_id=ACCOUNT_SALE_EXIT, expected_balance=0)
        await self._assert_account_balance(account_id=ACCOUNT_DEPOSIT, expected_balance=0)

        # after logging out a user with bookings the z_nr should not be incremented
        await self.till_service.logout_user(token=self.terminal_token)
        z_nr = await self.db_pool.fetchval("select z_nr from till where id = $1", self.till.id)
        self.assertEqual(z_nr_start, z_nr)
        # after logging in a user with bookings the z_nr should be incremented
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.admin_tag_uid), user_role_id=ADMIN_ROLE_ID
        )
        z_nr = await self.db_pool.fetchval("select z_nr from till where id = $1", self.till.id)
        self.assertEqual(z_nr_start + 1, z_nr)

    async def test_returnable_products(self):
        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=self.beer_button.id, quantity=-1)],
            customer_tag_uid=self.customer_uid,
        )
        with self.assertRaises(InvalidSaleException):
            await self.order_service.check_sale(
                token=self.terminal_token,
                new_sale=new_sale,
            )

        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[Button(till_button_id=self.deposit_button.id, quantity=-1)],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.total_price, -self.deposit_product.price)

    async def test_basic_sale_flow_with_deposit(self):
        # this test also checks if we can temporarily go below 0 balance due to different account bookings
        start_balance = self.beer_product.price * 5.0 - self.deposit_product.price / 2.0
        await self.db_conn.execute(
            "update account set balance = $1 where id = $2", start_balance, self.customer_account_id
        )
        sale_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_SALE_EXIT)
        deposit_start_balance = await self._get_account_balance(account_id=ACCOUNT_DEPOSIT)
        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
                Button(till_button_id=self.beer_button.id, quantity=2),
                Button(till_button_id=self.deposit_button.id, quantity=-1),
                Button(till_button_id=self.deposit_button.id, quantity=-5),
            ],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(pending_sale.old_balance, start_balance)
        # our initial order gets aggregated into one line item for beer and one for deposit
        self.assertEqual(len(pending_sale.line_items), 2)
        self.assertEqual(pending_sale.total_price, 5 * self.beer_product.price - self.deposit_product.price)
        self.assertEqual(pending_sale.new_balance, start_balance - pending_sale.total_price)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

        await self._assert_account_balance(
            account_id=self.customer_account_id, expected_balance=completed_sale.new_balance
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_SALE_EXIT, expected_balance=sale_exit_start_balance + self.beer_product.price * 5
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_DEPOSIT, expected_balance=deposit_start_balance - self.deposit_product.price
        )

    async def test_basic_sale_flow_with_only_deposit_return(self):
        deposit_start_balance = await self._get_account_balance(account_id=ACCOUNT_DEPOSIT)
        new_sale = NewSale(
            uuid=uuid.uuid4(),
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
        await self._assert_account_balance(
            account_id=self.customer_account_id, expected_balance=completed_sale.new_balance
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_DEPOSIT, expected_balance=deposit_start_balance - 3 * self.deposit_product.price
        )

    async def test_deposit_returns_cannot_exceed_account_limit(self):
        max_limit = await fetch_max_account_balance(conn=self.db_conn)
        n_deposits = int(max_limit / self.deposit_product.price) + 3
        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[
                Button(till_button_id=self.deposit_button.id, quantity=-n_deposits),
            ],
            customer_tag_uid=self.customer_uid,
        )
        with self.assertRaises(InvalidArgument):
            await self.order_service.check_sale(
                token=self.terminal_token,
                new_sale=new_sale,
            )

    async def test_basic_sale_flow_with_vouchers(self):
        await self.db_conn.execute("update account set vouchers = 3 where id = $1", self.customer_account_id)
        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
            ],
            customer_tag_uid=self.customer_uid,
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
        await self.db_conn.execute("update account set vouchers = 3 where id = $1", self.customer_account_id)
        new_sale = NewSale(
            uuid=uuid.uuid4(),
            buttons=[
                Button(till_button_id=self.beer_button.id, quantity=3),
                Button(till_button_id=self.beer_product_full.id, quantity=1),
            ],
            customer_tag_uid=self.customer_uid,
        )
        pending_sale: PendingSale = await self.order_service.check_sale(
            token=self.terminal_token,
            new_sale=new_sale,
        )
        self.assertEqual(3, pending_sale.used_vouchers)
        self.assertEqual(0, pending_sale.new_voucher_balance)
        self.assertEqual(self.beer_product_full.price + self.deposit_product.price * 4, pending_sale.total_price)

        new_sale.used_vouchers = 4
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

        self.assertEqual(
            self.beer_product_full.price + self.deposit_product.price * 4 + self.beer_product.price,
            pending_sale.total_price,
        )
        self.assertEqual(3, pending_sale.old_voucher_balance)
        self.assertEqual(1, pending_sale.new_voucher_balance)
        completed_sale = await self.order_service.book_sale(token=self.terminal_token, new_sale=new_sale)
        self.assertIsNotNone(completed_sale)

    async def test_only_topup_till_profiles_can_topup(self):
        profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile2",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=False,
                allow_cash_out=False,
                allow_ticket_sale=False,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        self.till.active_profile_id = profile.id
        await self.till_service.update_till(token=self.admin_token, till_id=self.till.id, till=self.till)

        with self.assertRaises(TillPermissionException):
            new_topup = NewTopUp(
                uuid=uuid.uuid4(),
                amount=20,
                payment_method=PaymentMethod.cash,
                customer_tag_uid=self.customer_uid,
            )
            await self.order_service.check_topup(token=self.terminal_token, new_topup=new_topup)

    async def test_topup_cash_order_flow(self):
        cash_drawer_start_balance = await self._get_account_balance(account_id=self.cashier.cashier_account_id)
        cash_sale_source_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_SALE_SOURCE)
        cash_entry_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_ENTRY)

        new_topup = NewTopUp(
            uuid=uuid.uuid4(),
            amount=20,
            payment_method=PaymentMethod.cash,
            customer_tag_uid=self.customer_uid,
        )
        pending_top_up = await self.order_service.check_topup(token=self.terminal_token, new_topup=new_topup)
        self.assertEqual(pending_top_up.old_balance, START_BALANCE)
        self.assertEqual(pending_top_up.amount, 20)
        self.assertEqual(pending_top_up.new_balance, START_BALANCE + pending_top_up.amount)
        completed_topup = await self.order_service.book_topup(token=self.terminal_token, new_topup=new_topup)
        self.assertIsNotNone(completed_topup)
        self.assertEqual(completed_topup.old_balance, START_BALANCE)
        self.assertEqual(completed_topup.amount, 20)
        self.assertEqual(completed_topup.new_balance, START_BALANCE + completed_topup.amount)
        await self._assert_account_balance(
            account_id=self.cashier.cashier_account_id, expected_balance=cash_drawer_start_balance + 20
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_ENTRY, expected_balance=cash_entry_start_balance - 20
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_SALE_SOURCE, expected_balance=cash_sale_source_start_balance - 20
        )

    async def test_topup_exceeding_max_limit_fails(self):
        max_limit = await fetch_max_account_balance(conn=self.db_conn)
        new_topup = NewTopUp(
            uuid=uuid.uuid4(),
            amount=max_limit + 1,
            payment_method=PaymentMethod.cash,
            customer_tag_uid=self.customer_uid,
        )
        with self.assertRaises(InvalidArgument):
            await self.order_service.check_topup(token=self.terminal_token, new_topup=new_topup)

    async def test_topup_sumup_order_flow(self):
        new_topup = NewTopUp(
            uuid=uuid.uuid4(),
            amount=20,
            payment_method=PaymentMethod.sumup,
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
        self.assertEqual(completed_topup.old_balance, START_BALANCE)
        self.assertEqual(completed_topup.amount, 20)
        self.assertEqual(completed_topup.new_balance, START_BALANCE + completed_topup.amount)
        await self._assert_account_balance(account_id=ACCOUNT_SUMUP, expected_balance=-20)

    async def test_only_payout_till_profiles_can_payout(self):
        profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile2",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=False,
                allow_cash_out=False,
                allow_ticket_sale=False,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        self.till.active_profile_id = profile.id
        await self.till_service.update_till(token=self.admin_token, till_id=self.till.id, till=self.till)

        with self.assertRaises(TillPermissionException):
            new_pay_out = NewPayOut(
                uuid=uuid.uuid4(),
                customer_tag_uid=self.customer_uid,
            )
            await self.order_service.check_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)

    async def test_cash_pay_out_flow_no_amount(self):
        cash_drawer_start_balance = await self._get_account_balance(account_id=self.cashier.cashier_account_id)
        cash_sale_source_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_SALE_SOURCE)
        cash_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_EXIT)

        new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=self.customer_uid)
        pending_pay_out = await self.order_service.check_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)
        self.assertEqual(pending_pay_out.old_balance, START_BALANCE)
        self.assertEqual(pending_pay_out.new_balance, 0)
        self.assertEqual(pending_pay_out.amount, -START_BALANCE)
        completed_pay_out = await self.order_service.book_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)
        self.assertIsNotNone(completed_pay_out)

        customer = await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=self.customer_uid)
        self.assertEqual(0, customer.balance)
        await self._assert_account_balance(
            expected_balance=cash_drawer_start_balance - START_BALANCE, account_id=self.cashier.cashier_account_id
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_SALE_SOURCE, expected_balance=cash_sale_source_start_balance + START_BALANCE
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_EXIT, expected_balance=cash_exit_start_balance + START_BALANCE
        )

    async def test_cash_pay_out_flow_with_amount(self):
        cash_drawer_start_balance = await self._get_account_balance(account_id=self.cashier.cashier_account_id)
        cash_sale_source_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_SALE_SOURCE)
        cash_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_EXIT)

        new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=self.customer_uid, amount=-2 * START_BALANCE)
        with self.assertRaises(NotEnoughFundsException):
            await self.order_service.check_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)

        new_pay_out = NewPayOut(uuid=uuid.uuid4(), customer_tag_uid=self.customer_uid, amount=-20)
        pending_pay_out = await self.order_service.check_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)
        self.assertEqual(pending_pay_out.old_balance, START_BALANCE)
        self.assertEqual(pending_pay_out.new_balance, START_BALANCE - 20)
        self.assertEqual(pending_pay_out.amount, -20)

        completed_pay_out = await self.order_service.book_pay_out(token=self.terminal_token, new_pay_out=new_pay_out)
        self.assertIsNotNone(completed_pay_out)

        customer = await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=self.customer_uid)
        self.assertEqual(START_BALANCE - 20, customer.balance)
        await self._assert_account_balance(
            account_id=self.cashier.cashier_account_id, expected_balance=cash_drawer_start_balance - 20
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_SALE_SOURCE, expected_balance=cash_sale_source_start_balance + 20
        )
        await self._assert_account_balance(account_id=ACCOUNT_CASH_EXIT, expected_balance=cash_exit_start_balance + 20)

    async def test_only_ticket_till_profiles_can_sell_tickets(self):
        profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile2",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=False,
                allow_cash_out=False,
                allow_ticket_sale=False,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        self.till.active_profile_id = profile.id
        await self.till_service.update_till(token=self.admin_token, till_id=self.till.id, till=self.till)

        with self.assertRaises(TillPermissionException):
            new_ticket_sale = NewTicketSale(
                uuid=uuid.uuid4(),
                customer_tag_uids=[self.customer_tag_uid],
                payment_method=PaymentMethod.cash,
            )
            await self.order_service.check_ticket_sale(token=self.terminal_token, new_ticket_sale=new_ticket_sale)

    async def test_ticket_flow_with_one_tag(self):
        cash_drawer_start_balance = await self._get_account_balance(account_id=self.cashier.cashier_account_id)
        cash_sale_source_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_SALE_SOURCE)
        cash_entry_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_ENTRY)
        sale_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_SALE_EXIT)

        unused_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")

        new_scan = NewTicketScan(customer_tag_uids=[unused_tag_uid])
        scan_result = await self.order_service.check_ticket_scan(token=self.terminal_token, new_ticket_scan=new_scan)
        self.assertIsNotNone(scan_result)

        new_ticket = NewTicketSale(
            uuid=uuid.uuid4(),
            customer_tag_uids=[unused_tag_uid],
            payment_method=PaymentMethod.cash,
        )
        pending_ticket = await self.order_service.check_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertEqual(2, pending_ticket.item_count)
        self.assertEqual(self.ticket.total_price, pending_ticket.total_price)
        completed_ticket = await self.order_service.book_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertIsNotNone(completed_ticket)

        customer = await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=unused_tag_uid)
        self.assertEqual(self.ticket.initial_top_up_amount, customer.balance)
        await self._assert_account_balance(
            account_id=self.cashier.cashier_account_id,
            expected_balance=cash_drawer_start_balance + completed_ticket.total_price,
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_ENTRY, expected_balance=cash_entry_start_balance - completed_ticket.total_price
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_SALE_SOURCE,
            expected_balance=cash_sale_source_start_balance + -completed_ticket.total_price,
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_SALE_EXIT, expected_balance=sale_exit_start_balance + self.ticket.price
        )

    async def test_ticket_flow_with_initial_topup_sumup(self):
        sumup_start_balance = await self._get_account_balance(account_id=ACCOUNT_SUMUP)
        sale_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_SALE_EXIT)
        unused_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")

        new_scan = NewTicketScan(customer_tag_uids=[unused_tag_uid])
        scan_result = await self.order_service.check_ticket_scan(token=self.terminal_token, new_ticket_scan=new_scan)
        self.assertIsNotNone(scan_result)

        new_ticket = NewTicketSale(
            uuid=uuid.uuid4(),
            customer_tag_uids=[unused_tag_uid],
            payment_method=PaymentMethod.sumup,
        )
        pending_ticket = await self.order_service.check_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertEqual(2, pending_ticket.item_count)
        self.assertEqual(self.ticket.total_price, pending_ticket.total_price)
        completed_ticket = await self.order_service.book_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertIsNotNone(completed_ticket)

        customer = await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=unused_tag_uid)
        self.assertEqual(self.ticket.initial_top_up_amount, customer.balance)
        await self._assert_account_balance(
            account_id=ACCOUNT_SUMUP, expected_balance=sumup_start_balance - completed_ticket.total_price
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_SALE_EXIT, expected_balance=sale_exit_start_balance + self.ticket.price
        )

    async def test_ticket_flow_with_multiple_tags_invalid_booking(self):
        cash_drawer_start_balance = await self._get_account_balance(account_id=self.cashier.cashier_account_id)
        cash_sale_source_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_SALE_SOURCE)
        cash_entry_start_balance = await self._get_account_balance(account_id=ACCOUNT_CASH_ENTRY)
        sale_exit_start_balance = await self._get_account_balance(account_id=ACCOUNT_SALE_EXIT)

        tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        tag2_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12346) returning uid")
        u18_tag_uid = await self.db_conn.fetchval(
            "insert into user_tag (uid, restriction) values (12347, 'under_18') returning uid"
        )
        u16_tag_uid = await self.db_conn.fetchval(
            "insert into user_tag (uid, restriction) values (12348, 'under_16') returning uid"
        )

        new_ticket = NewTicketSale(
            uuid=uuid.uuid4(),
            customer_tag_uids=[tag_uid, tag2_uid, u18_tag_uid, u16_tag_uid],
            payment_method=PaymentMethod.cash,
        )
        pending_ticket = await self.order_service.check_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertEqual(4, pending_ticket.item_count)
        self.assertEqual(4, len(pending_ticket.scanned_tickets))
        self.assertEqual(
            2 * self.ticket.total_price + self.ticket_u18.total_price + self.ticket_u16.total_price,
            pending_ticket.total_price,
        )
        completed_ticket: CompletedTicketSale = await self.order_service.book_ticket_sale(
            token=self.terminal_token, new_ticket_sale=new_ticket
        )
        self.assertIsNotNone(completed_ticket)
        await self._assert_account_balance(
            account_id=self.cashier.cashier_account_id,
            expected_balance=cash_drawer_start_balance + completed_ticket.total_price,
        )
        expected_line_items = {
            TICKET_PRODUCT_ID: 2,
            TICKET_U18_PRODUCT_ID: 1,
            TICKET_U16_PRODUCT_ID: 1,
        }
        for product_id, quantity in expected_line_items.items():
            items = [line_item for line_item in completed_ticket.line_items if line_item.product.id == product_id]
            self.assertEqual(1, len(items))
            self.assertEqual(quantity, items[0].quantity)

        self.assertEqual(
            self.ticket.initial_top_up_amount,
            (await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=tag_uid)).balance,
        )
        self.assertEqual(
            self.ticket.initial_top_up_amount,
            (await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=tag2_uid)).balance,
        )
        self.assertEqual(
            self.ticket_u18.initial_top_up_amount,
            (await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=u18_tag_uid)).balance,
        )
        self.assertEqual(
            self.ticket_u16.initial_top_up_amount,
            (await self.till_service.get_customer(token=self.terminal_token, customer_tag_uid=u16_tag_uid)).balance,
        )

        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_ENTRY, expected_balance=cash_entry_start_balance - completed_ticket.total_price
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_CASH_SALE_SOURCE,
            expected_balance=cash_sale_source_start_balance - completed_ticket.total_price,
        )
        await self._assert_account_balance(
            account_id=ACCOUNT_SALE_EXIT,
            expected_balance=sale_exit_start_balance
            + 2 * self.ticket.price
            + self.ticket_u18.price
            + self.ticket_u16.price,
        )
