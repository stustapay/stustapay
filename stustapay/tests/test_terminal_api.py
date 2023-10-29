# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import CurrentUser, UserRole, UserTag
from stustapay.core.service.common.error import AccessDenied
from stustapay.tests.common import TerminalTestCase


class TerminalAPiTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.finanzorga, self.finanzorga_role = await self.create_finanzorga(cashier_role_name=self.cashier_role.name)
        self.finanzorga_tag_uid = self.finanzorga.user_tag_uid
        assert self.finanzorga_tag_uid is not None

    async def test_terminal_user_management(self):
        # Cashier cannot simply login
        with self.assertRaises(AccessDenied):
            await self.till_service.check_user_login(
                token=self.terminal_token, user_tag=UserTag(uid=self.cashier.user_tag_uid)
            )
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(
                token=self.terminal_token,
                user_tag=UserTag(uid=self.cashier.user_tag_uid),
                user_role_id=self.cashier_role.id,
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

        # log in finanzorga as supervisor
        await self.till_service.login_user(
            token=self.terminal_token,
            user_tag=UserTag(uid=self.finanzorga_tag_uid),
            user_role_id=self.finanzorga_role.id,
        )
        # Now Cashiers can login
        roles = await self.till_service.check_user_login(
            token=self.terminal_token, user_tag=UserTag(uid=self.cashier.user_tag_uid)
        )
        self.assertEqual(1, len(roles))
        cashier_role = roles[0]
        cashier = await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.cashier.user_tag_uid), user_role_id=cashier_role.id
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier_role.name, cashier.active_role_name)
        self.assertEqual(cashier_role.id, cashier.active_role_id)

        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNotNone(user)
        self.assertEqual(cashier_role.name, user.active_role_name)
        self.assertEqual(cashier_role.id, user.active_role_id)

        await self.till_service.logout_user(token=self.terminal_token)
        user = await self.till_service.get_current_user(token=self.terminal_token)
        self.assertIsNone(user)

        # non supervisors cannot login when a supervisor is logged in with a non-supervisor role
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.finanzorga_tag_uid), user_role_id=self.cashier_role.id
        )
        with self.assertRaises(AccessDenied):
            await self.till_service.login_user(
                token=self.terminal_token,
                user_tag=UserTag(uid=self.cashier.user_tag_uid),
                user_role_id=self.cashier_role.id,
            )
