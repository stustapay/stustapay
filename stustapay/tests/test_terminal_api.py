# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.schema.user import Privilege, UserWithoutId, UserTag
from stustapay.tests.common import BaseTestCase


class TerminalAPiTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.finanzorga_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        self.finanzorga = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="Fianazorga",
                description="",
                privileges=[],
                user_tag_uid=self.finanzorga_tag_uid,
                display_name="Finanzorga",
            )
        )
        await self.user_service.promote_to_finanzorga(token=self.admin_token, user_id=self.finanzorga.id)
        self.finanzorga = await self.user_service.get_user(token=self.admin_token, user_id=self.finanzorga.id)

        await self.create_terminal_token()

    async def test_terminal_user_management(self):
        # Cashier cannot simply login
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid))
        # Admins can login
        orga = await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.finanzorga_tag_uid)
        )
        self.assertIsNotNone(orga)
        self.assertEqual(self.finanzorga, orga)
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
