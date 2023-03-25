# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.till import NewTill, NewTillLayout, NewTillProfile
from stustapay.core.schema.user import Privilege, UserWithoutId
from stustapay.core.service.till import TillService
from stustapay.tests.common import BaseTestCase


class TerminalAPiTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.till_service = TillService(db_pool=self.db_pool, config=self.test_config, user_service=self.user_service)

        cashier_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning id")
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="test_cashier", description="", privileges=[Privilege.cashier], user_tag=cashier_tag_id
            )
        )
        admin_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning id")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="Fianazorga", description="", privileges=[Privilege.finanzorga], user_tag=admin_tag_id
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
                active_user_id=None,
            ),
        )
        self.till = await self.till_service.get_till(token=self.admin_token, till_id=self.till.id)
        self.terminal_token = (
            await self.till_service.register_terminal(registration_uuid=self.till.registration_uuid)
        ).token

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
