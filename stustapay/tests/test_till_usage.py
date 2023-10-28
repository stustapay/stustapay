# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import ADMIN_ROLE_ID
from stustapay.core.service.common.error import AccessDenied

from .common import TerminalTestCase


class TillUsageTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        assert self.cashier.user_tag_uid is not None

    async def test_terminal_registration_flow(self):
        till = await self.till_service.get_till(token=self.admin_token, till_id=self.till.id)

        terminal_config = await self.till_service.get_terminal_config(token=self.terminal_token)
        self.assertEqual(terminal_config.id, till.id)

        # logout till from terminal
        await self.till_service.logout_terminal(token=self.terminal_token)

        # logout till from admin
        till = await self.till_service.get_till(token=self.admin_token, till_id=till.id)
        await self.till_service.register_terminal(registration_uuid=till.registration_uuid)
        logged_out = await self.till_service.logout_terminal_id(token=self.admin_token, till_id=till.id)
        self.assertTrue(logged_out)

    async def test_get_user_info(self):
        user_info = await self.till_service.get_user_info(
            token=self.terminal_token, user_tag_uid=self.cashier.user_tag_uid
        )
        self.assertIsNotNone(user_info)

        with self.assertRaises(AccessDenied):
            await self.till_service.get_user_info(token=self.terminal_token, user_tag_uid=self.admin_tag_uid)

        await self._login_supervised_user(self.admin_tag_uid, ADMIN_ROLE_ID)

        user_info = await self.till_service.get_user_info(
            token=self.terminal_token, user_tag_uid=self.cashier.user_tag_uid
        )
        self.assertIsNotNone(user_info)

        user_info = await self.till_service.get_user_info(token=self.terminal_token, user_tag_uid=self.admin_tag_uid)
        self.assertIsNotNone(user_info)
