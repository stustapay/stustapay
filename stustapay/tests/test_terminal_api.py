# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.schema.user import Privilege, UserWithoutId, UserTag
from stustapay.tests.common import BaseTestCase


class TerminalAPiTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.cashier_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning uid")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="test_cashier", description="", privileges=[Privilege.cashier], user_tag_uid=self.cashier_tag_uid
            )
        )
        self.admin_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="Fianazorga", description="", privileges=[Privilege.finanzorga], user_tag_uid=self.admin_tag_uid
            )
        )

        await self.create_terminal_token()

    async def test_terminal_user_management(self):
        # Cashier cannot simply login
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid))
        # Admins can login
        admin = await self.till_service.login_user(token=self.terminal_token, user_tag=UserTag(uid=self.admin_tag_uid))
        self.assertIsNotNone(admin)
        self.assertEqual(admin, self.admin)
        # Now Cashiers can login
        cashier = await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid)
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier, self.cashier)

        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNotNone(user)
        self.assertEqual(user, self.cashier)

        logged_out = await self.till_service.logout_user(token=self.terminal_token)
        self.assertTrue(logged_out)
        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNone(user)
