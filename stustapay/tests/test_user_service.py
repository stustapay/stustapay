# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import (
    NewUser,
    UserWithoutId,
    UserTag,
    ADMIN_ROLE_NAME,
    CASHIER_ROLE_NAME,
    FINANZORGA_ROLE_NAME,
    ADMIN_ROLE_ID,
    INFOZELT_ROLE_NAME,
)
from stustapay.core.service.common.error import AccessDenied
from stustapay.tests.common import TerminalTestCase


class UserServiceTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.cashier_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (654321) returning uid")
        self.finanzorga_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (1337) returning uid")
        admin_tag_uid = await self.db_conn.fetchval("insert into user_tag (uid) values (12345) returning uid")
        self.admin = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(
                login="terminal_admin",
                description="",
                role_names=[ADMIN_ROLE_NAME],
                user_tag_uid=admin_tag_uid,
                display_name="Terminal",
            )
        )
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=admin_tag_uid), user_role_id=ADMIN_ROLE_ID
        )

    async def test_user_creation(self):
        cashier = await self.user_service.create_user_terminal(
            token=self.terminal_token,
            new_user=NewUser(login="test-cashier", user_tag_uid=self.cashier_uid, role_names=[CASHIER_ROLE_NAME]),
        )
        self.assertIsNotNone(cashier)
        self.assertEqual(cashier.login, "test-cashier")
        self.assertListEqual(cashier.role_names, [CASHIER_ROLE_NAME])
        self.assertIsNotNone(cashier.cashier_account_id)
        self.assertIsNone(cashier.transport_account_id)
        self.assertEqual(cashier.user_tag_uid, self.cashier_uid)
        # Test creation if user already exists
        await self.user_service.create_user_terminal(
            token=self.terminal_token,
            new_user=NewUser(login="test-cashier", user_tag_uid=self.cashier_uid, role_names=[CASHIER_ROLE_NAME]),
        )

        cashier = await self.user_service.update_user_roles_terminal(
            token=self.terminal_token,
            user_tag_uid=self.cashier_uid,
            role_names=[INFOZELT_ROLE_NAME],
        )
        self.assertIsNotNone(cashier)
        self.assertListEqual(cashier.role_names, [INFOZELT_ROLE_NAME])

        with self.assertRaises(AccessDenied):
            await self.user_service.update_user_roles_terminal(
                token=self.terminal_token, user_tag_uid=self.cashier_uid, role_names=[FINANZORGA_ROLE_NAME]
            )
