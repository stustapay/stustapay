# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.tests.common import BaseTestCase


class TerminalAPiTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        cashier_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning id")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="test_cashier", description="", privileges=[Privilege.cashier], user_tag_id=cashier_tag_id
            )
        )
        admin_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning id")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="Fianazorga", description="", privileges=[Privilege.finanzorga], user_tag_id=admin_tag_id
            )
        )

        await self.create_terminal_token()

    async def test_terminal_user_management(self):
        # Cashier cannot simply login
        with self.assertRaises(PermissionError):
            await self.till_service.login_user(token=self.terminal_token, user_tag=54321)
        # Admins can login
        admin = await self.till_service.login_user(token=self.terminal_token, user_tag=12345)
        self.assertIsNotNone(admin)
        self.assertEqual(admin, self.admin)
        # Now Cashiers can login
        cashier = await self.till_service.login_user(token=self.terminal_token, user_tag=54321)
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier, self.cashier)

        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNotNone(user)
        self.assertEqual(user, self.cashier)

        logged_out = await self.till_service.logout_user(token=self.terminal_token)
        self.assertTrue(logged_out)
        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNone(user)
