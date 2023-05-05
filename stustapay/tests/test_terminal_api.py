# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import (
    UserWithoutId,
    UserTag,
    FINANZORGA_ROLE_NAME,
    UserRole,
    CurrentUser,
    CASHIER_ROLE_ID,
    INFOZELT_ROLE_ID,
)
from stustapay.core.service.common.error import AccessDenied
from stustapay.tests.common import TerminalTestCase


class TerminalAPiTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.finanzorga_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        self.finanzorga = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="Fianazorga",
                description="",
                role_names=[FINANZORGA_ROLE_NAME],
                user_tag_uid=self.finanzorga_tag_uid,
                display_name="Finanzorga",
            )
        )
        await self.user_service.promote_to_finanzorga(token=self.admin_token, user_id=self.finanzorga.id)
        self.finanzorga = await self.user_service.get_user(token=self.admin_token, user_id=self.finanzorga.id)

    async def test_terminal_user_management(self):
        # Cashier cannot simply login
        with self.assertRaises(AccessDenied):
            await self.till_service.check_user_login(
                token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid)
            )
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(
                token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid), user_role_id=CASHIER_ROLE_ID
            )
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(
                token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid), user_role_id=INFOZELT_ROLE_ID
            )

        # Admins can login
        roles: list[UserRole] = await self.till_service.check_user_login(
            token=self.terminal_token, user_tag=UserTag(uid=self.finanzorga_tag_uid)
        )
        for role in roles:
            orga: CurrentUser = await self.till_service.login_user(
                token=self.terminal_token, user_tag=UserTag(uid=self.finanzorga_tag_uid), user_role_id=role.id
            )
            self.assertIsNotNone(orga)
            self.assertEqual(role.name, orga.active_role_name)
            self.assertEqual(role.id, orga.active_role_id)

        # Now Cashiers can login
        roles: list[UserRole] = await self.till_service.check_user_login(
            token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid)
        )
        self.assertEqual(1, len(roles))
        cashier_role = roles[0]
        cashier = await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.cashier_tag_uid), user_role_id=cashier_role.id
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier_role.name, cashier.active_role_name)
        self.assertEqual(cashier_role.id, cashier.active_role_id)

        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNotNone(user)
        self.assertEqual(cashier_role.name, user.active_role_name)
        self.assertEqual(cashier_role.id, user.active_role_id)

        logged_out = await self.till_service.logout_user(token=self.terminal_token)
        self.assertTrue(logged_out)
        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNone(user)
