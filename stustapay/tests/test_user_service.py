# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import NewUser, Privilege, UserWithoutId, UserTag
from stustapay.tests.common import BaseTestCase


class UserServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        await self.create_terminal_token()

        self.cashier_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning uid")
        self.finanzorga_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (1337) returning uid")
        admin_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="terminal_admin", description="", privileges=[Privilege.admin], user_tag_uid=admin_tag_uid
            )
        )
        await self.till_service.login_user(token=self.terminal_token, user_tag=UserTag(uid=admin_tag_uid))

    async def test_user_creation(self):
        cashier = await self.user_service.create_cashier(
            token=self.terminal_token, new_user=NewUser(name="test-cashier", user_tag_uid=self.cashier_uid)
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier.name, "test-cashier")
        self.assertListEqual(cashier.privileges, [Privilege.cashier])
        self.assertIsNotNone(cashier.cashier_account_id)
        self.assertIsNone(cashier.transport_account_id)
        self.assertEqual(cashier.user_tag_uid, self.cashier_uid)
        # Test creation if user already exists
        await self.user_service.create_cashier(
            token=self.terminal_token, new_user=NewUser(name="test-cashier", user_tag_uid=self.cashier_uid)
        )

        finanzorga = await self.user_service.create_finanzorga(
            token=self.terminal_token, new_user=NewUser(name="test-finanzorga", user_tag_uid=self.finanzorga_uid)
        )
        self.assertIsNotNone(finanzorga)
        self.assertEqual(finanzorga.name, "test-finanzorga")
        self.assertSetEqual(set(finanzorga.privileges), {Privilege.cashier, Privilege.finanzorga})
        self.assertIsNotNone(finanzorga.transport_account_id)
        self.assertEqual(finanzorga.user_tag_uid, self.finanzorga_uid)
