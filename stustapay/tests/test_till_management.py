# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import uuid

from stustapay.core.schema.account import ACCOUNT_CASH_VAULT
from stustapay.core.schema.order import Button, NewSale, OrderType
from stustapay.core.schema.product import NewProduct
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
    FINANZORGA_ROLE_ID,
    FINANZORGA_ROLE_NAME,
    NewUser,
    UserTag,
)
from stustapay.core.service.cashier import (
    CashierService,
    CloseOut,
    InvalidCloseOutException,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument
from stustapay.core.service.order import OrderService

from .common import TerminalTestCase


class TillManagementTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.order_service = OrderService(db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service)
        self.cashier_service = CashierService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_till_register_stocking(self):
        stocking = await self.till_service.register.create_cash_register_stockings(
            token=self.admin_token,
            stocking=NewCashRegisterStocking(name="Dummy", euro20=2),
        )
        self.assertEqual("Dummy", stocking.name)
        self.assertEqual(40, stocking.total)

        stocking = await self.till_service.register.update_cash_register_stockings(
            token=self.admin_token,
            stocking_id=stocking.id,
            stocking=NewCashRegisterStocking(name="Dummy", euro20=2, euro5=10),
        )
        self.assertEqual(90, stocking.total)

        stockings = await self.till_service.register.list_cash_register_stockings_admin(token=self.admin_token)
        self.assertTrue(stocking in stockings)

        deleted = await self.till_service.register.delete_cash_register_stockings(
            token=self.admin_token, stocking_id=stocking.id
        )
        self.assertTrue(deleted)

    async def test_stock_up_cashier(self):
        n_orders_start = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer.name
        )

        cashier_tag_uid = await self.db_conn.fetchval(
            "insert into user_tag (node_id, uid) values ($1, $2) returning uid", self.node_id, 123413413
        )
        cashier = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login="cashier-asdf", display_name="", role_names=[CASHIER_ROLE_NAME], user_tag_uid=cashier_tag_uid
            ),
        )
        register = await self.till_service.register.create_cash_register(
            token=self.admin_token, new_register=NewCashRegister(name="Lade 25")
        )
        await self._login_supervised_user(user_tag_uid=self.admin_tag_uid, user_role_id=ADMIN_ROLE_ID)
        stocking = await self.till_service.register.create_cash_register_stockings(
            token=self.admin_token,
            stocking=NewCashRegisterStocking(name="My fancy stocking 25", euro20=2),
        )
        success = await self.till_service.register.stock_up_cash_register(
            token=self.terminal_token,
            cashier_tag_uid=cashier_tag_uid,
            stocking_id=stocking.id,
            cash_register_id=register.id,
        )
        self.assertTrue(success)

        await self._assert_account_balance(cashier.cashier_account_id, stocking.total)
        await self._assert_account_balance(ACCOUNT_CASH_VAULT, -stocking.total)

        # before logging in we did not produce a money transfer order
        n_orders = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer.name
        )
        self.assertEqual(n_orders_start, n_orders)

        await self._login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=CASHIER_ROLE_ID)

        # after logging in we've got a money transfer order to be signed
        n_orders = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer.name
        )
        self.assertEqual(n_orders_start + 1, n_orders)

        # we don't have any bookings but we simulate a close out
        # we book one order
        await self.order_service.book_sale(
            token=self.terminal_token,
            new_sale=NewSale(
                uuid=uuid.uuid4(),
                customer_tag_uid=self.customer_tag_uid,
                buttons=[Button(till_button_id=self.till_button.id, quantity=1)],
            ),
        )

        cashier = await self.cashier_service.get_cashier(token=self.admin_token, cashier_id=cashier.id)
        actual_balance = 458.2
        with self.assertRaises(InvalidCloseOutException):
            await self.cashier_service.close_out_cashier(
                token=self.admin_token,
                cashier_id=cashier.id,
                close_out=CloseOut(
                    comment="Some comment",
                    actual_cash_drawer_balance=actual_balance,
                    closing_out_user_id=self.admin_user.id,
                ),
            )

        await self.till_service.logout_user(token=self.terminal_token)
        n_orders = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer.name
        )
        self.assertEqual(n_orders_start + 2, n_orders)

        close_out_result = await self.cashier_service.close_out_cashier(
            token=self.admin_token,
            cashier_id=cashier.id,
            close_out=CloseOut(
                comment="Some comment",
                actual_cash_drawer_balance=actual_balance,
                closing_out_user_id=self.admin_user.id,
            ),
        )
        self.assertEqual(close_out_result.imbalance, actual_balance - cashier.cash_drawer_balance)

        await self._assert_account_balance(account_id=cashier.cashier_account_id, expected_balance=0)
        shifts = await self.cashier_service.get_cashier_shifts(token=self.admin_token, cashier_id=cashier.id)
        self.assertEqual(len(shifts), 1)
        n_orders = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer.name
        )
        self.assertEqual(n_orders_start + 4, n_orders)
        n_orders = await self.db_conn.fetchval(
            "select count(*) from ordr where order_type = $1", OrderType.money_transfer_imbalance.name
        )
        self.assertEqual(1, n_orders)
        # the sum of cash order values at all tills should be 0 as we closed out the tills
        balances = await self.db_conn.fetch(
            "select o.till_id, sum(li.total_price) as till_balance "
            "from line_item li "
            "join ordr o on li.order_id = o.id "
            "where o.payment_method = 'cash' "
            "group by o.till_id"
        )
        self.assertIsNot(0, len(balances))
        for balance in balances:
            self.assertEqual(
                0,
                balance["till_balance"],
                msg=f"Till with id {balance['till_id']} does not have a cash balance of 0, received {balance['till_balance']}",
            )

    async def test_transport_and_cashier_account_management(self):
        admin_terminal_token = await self.create_terminal(name="Admin terminal")
        await self.till_service.login_user(
            token=admin_terminal_token, user_tag=UserTag(uid=self.finanzorga_tag_uid), user_role_id=FINANZORGA_ROLE_ID
        )

        await self.till_service.register.modify_transport_account_balance(
            token=admin_terminal_token, orga_tag_uid=self.finanzorga_tag_uid, amount=100
        )

        await self._assert_account_balance(self.finanzorga_user.transport_account_id, 100)
        await self._assert_account_balance(ACCOUNT_CASH_VAULT, -100)

        with self.assertRaises(InvalidArgument):
            await self.till_service.register.modify_cashier_account_balance(
                token=admin_terminal_token, cashier_tag_uid=self.cashier_tag_uid, amount=120
            )

        await self.till_service.register.modify_cashier_account_balance(
            token=admin_terminal_token, cashier_tag_uid=self.cashier_tag_uid, amount=60
        )
        await self._assert_account_balance(self.finanzorga_user.transport_account_id, 40)
        await self._assert_account_balance(self.cashier.cashier_account_id, 60)
        await self.till_service.register.modify_cashier_account_balance(
            token=admin_terminal_token, cashier_tag_uid=self.cashier_tag_uid, amount=-30
        )
        await self._assert_account_balance(self.finanzorga_user.transport_account_id, 70)
        await self._assert_account_balance(self.cashier.cashier_account_id, 30)

        with self.assertRaises(InvalidArgument):
            await self.till_service.register.modify_transport_account_balance(
                token=admin_terminal_token, orga_tag_uid=self.finanzorga_tag_uid, amount=-100
            )
        await self.till_service.register.modify_transport_account_balance(
            token=admin_terminal_token, orga_tag_uid=self.finanzorga_tag_uid, amount=-70
        )
        await self._assert_account_balance(self.finanzorga_user.transport_account_id, 0)
        await self._assert_account_balance(ACCOUNT_CASH_VAULT, -30)

    async def test_basic_till_button_workflow(self):
        product1 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Helles 0,5l", price=3, tax_name="ust", is_locked=True)
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Radler 0,5l", price=2.5, tax_name="ust", is_locked=True)
        )
        product_pfand = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Pfand", price=2.5, tax_name="ust", is_locked=True)
        )

        button = await self.till_service.layout.create_button(
            token=self.admin_token,
            button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
        )
        self.assertEqual(button.name, "Helles 0,5l")
        self.assertEqual(button.price, 5.5)

        with self.assertRaises(AccessDenied):
            await self.till_service.layout.create_button(
                token=self.cashier_token,
                button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
            )

        updated_button = await self.till_service.layout.update_button(
            token=self.admin_token,
            button_id=button.id,
            button=NewTillButton(name="Radler 0,5l", product_ids=[product2.id, product_pfand.id]),
        )
        self.assertEqual(updated_button.name, "Radler 0,5l")
        self.assertEqual(updated_button.price, 5)

        buttons = await self.till_service.layout.list_buttons(token=self.admin_token)
        self.assertTrue(updated_button in buttons)

        with self.assertRaises(AccessDenied):
            await self.till_service.layout.delete_button(token=self.cashier_token, button_id=updated_button.id)

        deleted = await self.till_service.layout.delete_button(token=self.admin_token, button_id=updated_button.id)
        self.assertTrue(deleted)

    async def test_basic_till_workflow(self):
        button1 = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="Helles 1,0l", product_ids=[])
        )
        button2 = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="Helles 0,5l", product_ids=[])
        )
        till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            layout=NewTillLayout(name="layout1", description="", button_ids=[button1.id, button2.id]),
        )
        till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            profile=NewTillProfile(
                name="profile1",
                description="",
                layout_id=till_layout.id,
                allow_top_up=False,
                allow_cash_out=False,
                allow_ticket_sale=False,
                allowed_role_names=[ADMIN_ROLE_NAME, FINANZORGA_ROLE_NAME, CASHIER_ROLE_NAME],
            ),
        )
        till = await self.till_service.create_till(
            token=self.admin_token,
            till=NewTill(
                name="Pot 1",
                description="Pottipot",
                active_shift=None,
                active_profile_id=till_profile.id,
            ),
        )
        self.assertEqual(till.name, "Pot 1")

        with self.assertRaises(AccessDenied):
            await self.till_service.create_till(
                token=self.cashier_token,
                till=NewTill(
                    name="Pot 1",
                    description="Pottipot",
                    active_shift=None,
                    active_profile_id=till_profile.id,
                ),
            )

        updated_till = await self.till_service.update_till(
            token=self.admin_token,
            till_id=till.id,
            till=NewTill(
                name="Pot 2",
                description="Pottipot - new",
                active_shift=None,
                active_user_id=None,
                active_profile_id=till_profile.id,
            ),
        )
        self.assertEqual(updated_till.name, "Pot 2")
        self.assertEqual(updated_till.description, "Pottipot - new")

        tills = await self.till_service.list_tills(token=self.admin_token)
        self.assertTrue(updated_till in tills)

        with self.assertRaises(AccessDenied):
            await self.till_service.delete_till(token=self.cashier_token, till_id=till.id)

        deleted = await self.till_service.delete_till(token=self.admin_token, till_id=till.id)
        self.assertTrue(deleted)

    async def test_button_references_locked_products(self):
        product = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="foo", is_locked=False, price=5, tax_name="ust")
        )
        with self.assertRaises(Exception):
            await self.till_service.layout.create_button(
                token=self.admin_token, button=NewTillButton(name="foo", product_ids=[product.id])
            )

        product = await self.product_service.update_product(
            token=self.admin_token,
            product_id=product.id,
            product=NewProduct(name="foo", is_locked=True, price=5, tax_name="ust"),
        )
        button = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="foo", product_ids=[product.id])
        )
        self.assertIsNotNone(button)

    async def test_button_references_max_one_variable_price_product(self):
        product1 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p1", is_locked=True, fixed_price=False, tax_name="ust", price=None),
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p2", is_locked=True, fixed_price=False, tax_name="ust", price=None),
        )
        button = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
        )
        self.assertIsNotNone(button)

        with self.assertRaises(Exception):
            await self.till_service.layout.update_button(
                token=self.admin_token,
                button_id=button.id,
                button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
            )

    async def test_button_references_max_one_returnable_product(self):
        product1 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p1", is_locked=True, price=5, is_returnable=True, tax_name="ust"),
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p2", is_locked=True, price=3, is_returnable=True, tax_name="ust"),
        )
        button = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
        )
        self.assertIsNotNone(button)

        with self.assertRaises(Exception):
            await self.till_service.layout.update_button(
                token=self.admin_token,
                button_id=button.id,
                button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
            )

    async def test_button_references_max_one_voucher_product(self):
        product1 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p1", is_locked=True, price=5, price_in_vouchers=3, tax_name="ust"),
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(name="p2", is_locked=True, price=3, price_in_vouchers=2, tax_name="ust"),
        )
        button = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
        )
        self.assertIsNotNone(button)

        with self.assertRaises(Exception):
            await self.till_service.layout.update_button(
                token=self.admin_token,
                button_id=button.id,
                button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
            )

    async def test_transfer_cash_register(self):
        cashier2_uid = 12323132
        row = await self.db_pool.fetchrow(
            "select usr.cash_register_id, a.balance "
            "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
            self.cashier.id,
        )
        self.assertEqual(self.stocking.total, row["balance"])
        self.assertEqual(self.register.id, row["cash_register_id"])

        await self.db_pool.execute("insert into user_tag (node_id, uid) values ($1, $2)", self.node_id, cashier2_uid)
        cashier2 = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login="cashier2", display_name="cashier2", role_names=["cashier"], user_tag_uid=cashier2_uid
            ),
        )

        with self.assertRaises(InvalidArgument):
            # cashier is still logged in
            await self.till_service.register.transfer_cash_register_terminal(
                token=self.terminal_token,
                source_cashier_tag_uid=self.cashier_tag_uid,
                target_cashier_tag_uid=cashier2_uid,
            )

        await self.till_service.logout_user(token=self.terminal_token)
        await self.till_service.register.transfer_cash_register_terminal(
            token=self.terminal_token, source_cashier_tag_uid=self.cashier_tag_uid, target_cashier_tag_uid=cashier2_uid
        )

        row = await self.db_pool.fetchrow(
            "select usr.cash_register_id, a.balance from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
            cashier2.id,
        )
        self.assertEqual(self.stocking.total, row["balance"])
        self.assertEqual(self.register.id, row["cash_register_id"])

        row = await self.db_pool.fetchrow(
            "select usr.cash_register_id, a.balance from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
            self.cashier.id,
        )
        self.assertEqual(0, row["balance"])
        self.assertIsNone(row["cash_register_id"])

        # we can transfer it back
        await self.till_service.register.transfer_cash_register_terminal(
            token=self.terminal_token, source_cashier_tag_uid=cashier2_uid, target_cashier_tag_uid=self.cashier_tag_uid
        )

        row = await self.db_pool.fetchrow(
            "select usr.cash_register_id, a.balance from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
            cashier2.id,
        )
        self.assertEqual(0, row["balance"])
        self.assertIsNone(row["cash_register_id"])

        row = await self.db_pool.fetchrow(
            "select usr.cash_register_id, a.balance from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
            self.cashier.id,
        )
        self.assertEqual(self.stocking.total, row["balance"])
        self.assertEqual(self.register.id, row["cash_register_id"])
