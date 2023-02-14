from stustapay.core.schema.user import User, Privilege
from .common import BaseTestCase
from stustapay.core.schema.terminal import NewTerminal, Terminal
from stustapay.core.service.terminal import TerminalService


class TerminalServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.admin_user = User(id=1, name="test-user", description="", privileges=[Privilege.admin])
        self.orga_user = User(id=1, name="test-user", description="", privileges=[Privilege.orga])

        self.terminal_service = TerminalService(db_pool=self.db_pool, config=self.test_config)

    async def test_basic_terminal_workflow(self):
        terminal = await self.terminal_service.create_terminal(
            current_user=self.admin_user,
            terminal=NewTerminal(
                name="Pot 1",
                description="Pottipot",
                tseid=None,
                active_shift=None,
                active_cashier=None,
                active_profile=None,
            ),
        )
        self.assertEqual(terminal.name, "Pot 1")

        with self.assertRaises(PermissionError):
            await self.terminal_service.create_terminal(
                current_user=self.orga_user,
                terminal=NewTerminal(
                    name="Pot 1",
                    description="Pottipot",
                    tseid=None,
                    active_shift=None,
                    active_cashier=None,
                    active_profile=None,
                ),
            )

        updated_terminal = await self.terminal_service.update_terminal(
            current_user=self.admin_user,
            terminal_id=terminal.id,
            terminal=NewTerminal(
                name="Pot 2",
                description="Pottipot - new",
                tseid=None,
                active_shift=None,
                active_cashier=None,
                active_profile=None,
            ),
        )
        self.assertEqual(updated_terminal.name, "Pot 2")
        self.assertEqual(updated_terminal.description, "Pottipot - new")

        terminals = await self.terminal_service.list_terminals(current_user=self.admin_user)
        self.assertEqual(len(terminals), 1)
        self.assertEqual(terminals[0].name, "Pot 2")

        with self.assertRaises(PermissionError):
            await self.terminal_service.delete_terminal(current_user=self.orga_user, terminal_id=terminal.id)

        deleted = await self.terminal_service.delete_terminal(current_user=self.admin_user, terminal_id=terminal.id)
        self.assertTrue(deleted)
