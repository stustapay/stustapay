# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from .common import TerminalTestCase


class TillUsageTest(TerminalTestCase):
    async def test_terminal_registration_flow(self):
        till = await self.till_service.get_till(token=self.admin_token, till_id=self.till.id)

        terminal_config = await self.till_service.get_terminal_config(token=self.terminal_token)
        self.assertEqual(terminal_config.id, till.id)

        # logout till from terminal
        logged_out = await self.till_service.logout_terminal(token=self.terminal_token)
        self.assertTrue(logged_out)

        # logout till from admin
        till = await self.till_service.get_till(token=self.admin_token, till_id=till.id)
        await self.till_service.register_terminal(registration_uuid=till.registration_uuid)
        logged_out = await self.till_service.logout_terminal_id(token=self.admin_token, till_id=till.id)
        self.assertTrue(logged_out)
