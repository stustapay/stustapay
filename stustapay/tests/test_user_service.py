# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import secrets

from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    ADMIN_ROLE_NAME,
    NewUser,
    NewUserRole,
    UserRole,
    UserTag,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument
from stustapay.tests.common import TerminalTestCase


class UserServiceTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.cashier_uid = await self.create_random_user_tag()
        self.finanzorga_uid = await self.create_random_user_tag()
        admin_tag_uid = await self.create_random_user_tag()
        self.admin = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login=f"terminal_admin {secrets.token_hex()}",
                description="",
                role_names=[ADMIN_ROLE_NAME],
                user_tag_uid=admin_tag_uid,
                display_name="Terminal",
            ),
        )
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=admin_tag_uid), user_role_id=ADMIN_ROLE_ID
        )

    async def test_change_password(self):
        with self.assertRaises(AccessDenied):  # test with invalid password
            await self.user_service.change_password(token=self.admin_token, old_password="foobar", new_password="asdf")
        await self.user_service.change_password(token=self.admin_token, old_password="rolf", new_password="asdf")

        await self.user_service.login_user(username=self.admin_user.login, password="asdf")

    async def test_user_creation(self):
        user_tag_uid = await self.create_random_user_tag()
        test_role1: UserRole = await self.user_service.create_user_role(
            token=self.admin_token,
            node_id=self.node_id,
            new_role=NewUserRole(name="test-role-1", is_privileged=False, privileges=[]),
        )
        test_role2: UserRole = await self.user_service.create_user_role(
            token=self.admin_token,
            node_id=self.node_id,
            new_role=NewUserRole(name="test-role-2", is_privileged=False, privileges=[]),
        )
        privileged_role: UserRole = await self.user_service.create_user_role(
            token=self.admin_token,
            node_id=self.node_id,
            new_role=NewUserRole(name="privileged-role", is_privileged=True, privileges=[]),
        )
        user = await self.user_service.create_user_terminal(
            token=self.terminal_token,
            new_user=NewUser(
                login="test-cashier", display_name="", user_tag_uid=user_tag_uid, role_names=[test_role1.name]
            ),
        )
        self.assertIsNotNone(user)
        self.assertEqual(user.login, "test-cashier")
        self.assertListEqual(user.role_names, [test_role1.name])
        self.assertIsNone(user.cashier_account_id)
        self.assertIsNone(user.transport_account_id)
        self.assertEqual(user.user_tag_uid, user_tag_uid)
        # Test creation if user already exists, then this should return an error
        with self.assertRaises(InvalidArgument):
            await self.user_service.create_user_terminal(
                token=self.terminal_token,
                new_user=NewUser(
                    login="test-cashier", display_name="", user_tag_uid=user_tag_uid, role_names=[test_role2.name]
                ),
            )

        user = await self.user_service.update_user_roles_terminal(
            token=self.terminal_token,
            user_tag_uid=user_tag_uid,
            role_names=[test_role2.name],
        )
        self.assertIsNotNone(user)
        self.assertListEqual(user.role_names, [test_role2.name])

        with self.assertRaises(AccessDenied):
            await self.user_service.update_user_roles_terminal(
                token=self.terminal_token, user_tag_uid=user_tag_uid, role_names=[privileged_role.name]
            )
