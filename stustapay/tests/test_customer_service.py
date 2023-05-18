# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import unittest
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer import CustomerService
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.tests.common import TEST_CONFIG, TerminalTestCase
from stustapay.core.config import CustomerPortalApiConfig
from stustapay.core.schema.customer import CustomerBank
from stustapay.core.service.common.error import InvalidArgument, Unauthorized
from dateutil.parser import parse


class CustomerServiceTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

        self.customer_service = CustomerService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
            config_service=self.config_service,
        )

        self.uid = 1234
        self.pin = "pin"
        self.account_id = 10
        self.balance = 1000
        self.cashier_id = 5

        self.bon_path = "test_bon.pdf"
        pc = await self.config_service.get_public_config()
        self.currency_symbol = pc.currency_symbol
        self.currency_identifier = pc.currency_identifier

        await self.db_conn.execute(
            "insert into user_tag (uid, pin) values ($1, $2)",
            self.uid,
            self.pin,
        )

        # usr needed by ordr
        await self.db_conn.execute(
            "insert into usr (id, login, display_name, user_tag_uid) overriding system value values ($1, $2, $3, $4)",
            self.cashier_id,
            "test login",
            "test display name",
            self.uid,
        )

        await self.db_conn.execute(
            "insert into account (id, user_tag_uid, balance, type) overriding system value values ($1, $2, $3, $4)",
            self.account_id,
            self.uid,
            self.balance,
            "private",
        )

        product1 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Bier", price=5.0, tax_name="ust")
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Pfand", price=2.0, tax_name="none")
        )

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=product1.id,
                product_price=product1.price,
                tax_name=product1.tax_name,
                tax_rate=product1.tax_rate,
            ),
            NewLineItem(
                quantity=1,
                product_id=product2.id,
                product_price=product2.price,
                tax_name=product2.tax_name,
                tax_rate=product2.tax_rate,
            ),
        ]

        booking = await book_order(
            conn=self.db_conn,
            order_type=OrderType.sale,
            payment_method=PaymentMethod.tag,
            cashier_id=self.cashier_id,
            till_id=self.till.id,
            line_items=line_items,
            bookings={},
            customer_account_id=self.account_id,
        )

        self.order = await fetch_order(conn=self.db_conn, order_id=booking.id)
        assert self.order is not None

        await self.db_conn.execute(
            "insert into bon (id, generated, generated_at, output_file) overriding system value "
            "values ($1, $2, $3, $4)",
            self.order.id,
            True,
            parse("2023-01-01 15:35:02 UTC+1"),
            self.bon_path,
        )

    async def test_auth_customer(self):
        # test login_customer
        auth = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)
        self.assertIsNotNone(auth)
        self.assertEqual(auth.customer.id, self.account_id)
        self.assertEqual(auth.customer.balance, self.balance)

        # test get_customer with correct token
        result = await self.customer_service.get_customer(token=auth.token)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.account_id)
        self.assertEqual(result.balance, self.balance)

        # test get_customer with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token="wrong")

        # test logout_customer
        await self.customer_service.logout_customer(token=auth.token)
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token=auth.token)

        # test wrong pin
        result = await self.customer_service.login_customer(uid=self.uid, pin="wrong")
        self.assertIsNone(result)

    async def test_get_orders_with_bon(self):
        # test get_orders_with_bon with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_orders_with_bon(token="wrong")

        # login
        result = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)  # type: ignore
        self.assertIsNotNone(result)

        # test get_orders_with_bon
        result = await self.customer_service.get_orders_with_bon(token=result.token)
        self.assertIsNotNone(result)

        self.assertEqual(result[0].id, self.order.id)
        self.assertEqual(result[0].booked_at, self.order.booked_at)
        self.assertEqual(result[0].payment_method, self.order.payment_method)
        self.assertEqual(result[0].order_type, self.order.order_type)
        self.assertEqual(result[0].cashier_id, self.order.cashier_id)
        self.assertEqual(result[0].till_id, self.order.till_id)
        self.assertEqual(result[0].customer_account_id, self.order.customer_account_id)

        self.assertEqual(result[0].line_items[0].item_id, self.order.line_items[0].item_id)
        self.assertEqual(result[0].line_items[0].product_price, self.order.line_items[0].product_price)
        self.assertEqual(result[0].line_items[0].quantity, self.order.line_items[0].quantity)
        self.assertEqual(result[0].line_items[0].tax_name, self.order.line_items[0].tax_name)
        self.assertEqual(result[0].line_items[0].tax_rate, self.order.line_items[0].tax_rate)

        self.assertEqual(result[0].line_items[1].item_id, self.order.line_items[1].item_id)
        self.assertEqual(result[0].line_items[1].product_price, self.order.line_items[1].product_price)
        self.assertEqual(result[0].line_items[1].quantity, self.order.line_items[1].quantity)
        self.assertEqual(result[0].line_items[1].tax_name, self.order.line_items[1].tax_name)
        self.assertEqual(result[0].line_items[1].tax_rate, self.order.line_items[1].tax_rate)

        # test bon data
        self.assertTrue(result[0].bon_generated)
        # self.assertEqual(result[0].bon_output_file, self.bon_path)

        self.assertEqual(
            result[0].bon_output_file,
            self.test_config.customer_portal.base_bon_url.format(bon_output_file=self.bon_path),
        )

    async def test_update_customer_info(self):
        # login
        auth = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)
        self.assertIsNotNone(auth)

        valid_IBAN = "DE89370400440532013000"
        invalid_IBAN = "DE89370400440532013001"

        account_name = "Der Tester"
        email = "test@testermensch.de"

        customer_bank = CustomerBank(
            iban=valid_IBAN,
            account_name=account_name,
            email=email,
        )

        await self.customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

        # test if get_customer returns the updated data
        result = await self.customer_service.get_customer(token=auth.token)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.account_id)
        self.assertEqual(result.balance, self.balance)
        self.assertEqual(result.iban, valid_IBAN)
        self.assertEqual(result.account_name, account_name)
        self.assertEqual(result.email, email)

        # test invalid IBAN
        customer_bank = CustomerBank(
            iban=invalid_IBAN,
            account_name=account_name,
            email=email,
        )
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # TODO: test not allowed country codes

        # test if update_customer_info with wrong token raises Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.update_customer_info(token="wrong", customer_bank=customer_bank)

    async def test_get_public_customer_api_config(self):
        result = await self.customer_service.get_public_customer_api_config()
        self.assertIsNotNone(result)
        self.assertEqual(result.currency_identifier, self.currency_identifier)
        self.assertEqual(result.currency_symbol, self.currency_symbol)

        # TODO: change when config is refactored
        # test config keys from yaml config
        cpc = CustomerPortalApiConfig.parse_obj(TEST_CONFIG["customer_portal"])
        self.assertEqual(result.data_privacy_url, cpc.data_privacy_url)
        self.assertEqual(result.contact_email, cpc.contact_email)
        self.assertEqual(result.about_page_url, cpc.about_page_url)


if __name__ == "__main__":
    unittest.main()
