# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import NewUser, Privilege, UserWithoutId
from stustapay.tests.common import BaseTestCase


class UserServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        await self.create_terminal_token()

        await self.db_conn.fetchval("insert into user_tag (uid) values (54321) returning id")
        await self.db_conn.fetchval("insert into user_tag (uid) values (1337) returning id")
        admin_tag_id = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning id")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                name="terminal_admin", description="", privileges=[Privilege.admin], user_tag_id=admin_tag_id
            )
        )
        await self.till_service.login_user(token=self.terminal_token, user_tag=12345)

    async def test_user_creation(self):
        cashier = await self.user_service.create_cashier(
            token=self.terminal_token, new_user=NewUser(name="test-cashier", user_tag=54321)
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier.name, "test-cashier")
        self.assertListEqual(cashier.privileges, [Privilege.cashier])
        self.assertIsNotNone(cashier.cashier_account_id)
        # Test creation if user already exists
        await self.user_service.create_cashier(
            token=self.terminal_token, new_user=NewUser(name="test-cashier", user_tag=54321)
        )

        finanzorga = await self.user_service.create_finanzorga(
            token=self.terminal_token, new_user=NewUser(name="test-finanzorga", user_tag=1337)
        )
        self.assertIsNotNone(finanzorga)
        self.assertEqual(finanzorga.name, "test-finanzorga")
        self.assertSetEqual(set(finanzorga.privileges), {Privilege.cashier, Privilege.finanzorga})
        self.assertIsNotNone(finanzorga.transport_account_id)
        self.assertIsNone(cashier.transport_account_id)
