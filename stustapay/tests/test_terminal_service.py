# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.terminal import NewTerminal, NewTerminalProfile, NewTerminalLayout, NewTerminalButton
from stustapay.core.schema.user import User, Privilege
from stustapay.core.service.product import ProductService
from stustapay.core.service.terminal.terminal import TerminalService
from .common import BaseTestCase


class TerminalServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.admin_user = User(id=1, name="test-user", description="", privileges=[Privilege.admin])
        self.orga_user = User(id=1, name="test-user", description="", privileges=[Privilege.orga])

        self.terminal_service = TerminalService(db_pool=self.db_pool, config=self.test_config)
        self.product_service = ProductService(db_pool=self.db_pool, config=self.test_config)

    async def test_basic_terminal_button_workflow(self):
        product1 = await self.product_service.create_product(
            current_user=self.admin_user, product=NewProduct(name="Helles 0,5l", price=3, tax_name="ust")
        )
        product2 = await self.product_service.create_product(
            current_user=self.admin_user, product=NewProduct(name="Radler 0,5l", price=2.5, tax_name="ust")
        )
        product_pfand = await self.product_service.create_product(
            current_user=self.admin_user, product=NewProduct(name="Pfand", price=2.5, tax_name="ust")
        )

        button = await self.terminal_service.layout.create_button(
            current_user=self.admin_user,
            button=NewTerminalButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
        )
        self.assertEqual(button.name, "Helles 0,5l")
        self.assertEqual(button.price, 5.5)

        with self.assertRaises(PermissionError):
            await self.terminal_service.layout.create_button(
                current_user=self.orga_user,
                button=NewTerminalButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
            )

        updated_button = await self.terminal_service.layout.update_button(
            current_user=self.admin_user,
            button_id=button.id,
            button=NewTerminalButton(name="Radler 0,5l", product_ids=[product2.id, product_pfand.id]),
        )
        self.assertEqual(updated_button.name, "Radler 0,5l")
        self.assertEqual(updated_button.price, 5)

        buttons = await self.terminal_service.layout.list_buttons(current_user=self.admin_user)
        self.assertEqual(len(buttons), 1)
        self.assertTrue(updated_button in buttons)

        with self.assertRaises(PermissionError):
            await self.terminal_service.layout.delete_button(current_user=self.orga_user, button_id=updated_button.id)

        deleted = await self.terminal_service.layout.delete_button(
            current_user=self.admin_user, button_id=updated_button.id
        )
        self.assertTrue(deleted)

    async def test_basic_terminal_workflow(self):
        button1 = await self.terminal_service.layout.create_button(
            current_user=self.admin_user, button=NewTerminalButton(name="Helles 1,0l", product_ids=[])
        )
        button2 = await self.terminal_service.layout.create_button(
            current_user=self.admin_user, button=NewTerminalButton(name="Helles 0,5l", product_ids=[])
        )
        terminal_layout = await self.terminal_service.layout.create_layout(
            current_user=self.admin_user,
            layout=NewTerminalLayout(name="layout1", description="", button_ids=[button1.id, button2.id]),
        )
        terminal_profile = await self.terminal_service.profile.create_profile(
            current_user=self.admin_user,
            profile=NewTerminalProfile(name="profile1", description="", layout_id=terminal_layout.id),
        )
        terminal = await self.terminal_service.create_terminal(
            current_user=self.admin_user,
            terminal=NewTerminal(
                name="Pot 1",
                description="Pottipot",
                tse_id=None,
                active_shift=None,
                active_cashier_id=None,
                active_profile_id=terminal_profile.id,
            ),
        )
        self.assertEqual(terminal.name, "Pot 1")

        with self.assertRaises(PermissionError):
            await self.terminal_service.create_terminal(
                current_user=self.orga_user,
                terminal=NewTerminal(
                    name="Pot 1",
                    description="Pottipot",
                    tse_id=None,
                    active_shift=None,
                    active_cashier_id=None,
                    active_profile_id=terminal_profile.id,
                ),
            )

        updated_terminal = await self.terminal_service.update_terminal(
            current_user=self.admin_user,
            terminal_id=terminal.id,
            terminal=NewTerminal(
                name="Pot 2",
                description="Pottipot - new",
                tse_id=None,
                active_shift=None,
                active_cashier_id=None,
                active_profile_id=terminal_profile.id,
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
