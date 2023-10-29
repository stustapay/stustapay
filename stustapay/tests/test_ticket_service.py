# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.ticket import NewTicket
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.ticket import TicketService

from .common import BaseTestCase


class TicketServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.ticket_service = TicketService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_ticket_workflow(self):
        _, _, cashier_token = await self.create_cashier()
        ticket = await self.ticket_service.create_ticket(
            token=self.admin_token,
            ticket=NewTicket(
                name="Test Ticket",
                price=12,
                tax_rate_id=self.tax_rate_none.id,
                is_locked=False,
                restrictions=[],
                initial_top_up_amount=8,
            ),
        )
        self.assertEqual(ticket.name, "Test Ticket")

        with self.assertRaises(AccessDenied):
            await self.ticket_service.create_ticket(
                token=cashier_token,
                ticket=NewTicket(
                    name="Updated Test Ticket",
                    price=12,
                    tax_rate_id=self.tax_rate_ust.id,
                    is_locked=True,
                    restrictions=[],
                    initial_top_up_amount=8,
                ),
            )

        updated_ticket = await self.ticket_service.update_ticket(
            token=self.admin_token,
            ticket_id=ticket.id,
            ticket=NewTicket(
                name="Updated Test Ticket",
                price=12,
                tax_rate_id=self.tax_rate_ust.id,
                is_locked=True,
                restrictions=[],
                initial_top_up_amount=4,
            ),
        )
        self.assertEqual(updated_ticket.name, "Updated Test Ticket")
        self.assertEqual(updated_ticket.initial_top_up_amount, 4)
        self.assertTrue(updated_ticket.is_locked)

        tickets = await self.ticket_service.list_tickets(token=self.admin_token)
        self.assertEqual(len(list(filter(lambda p: p.name == "Updated Test Ticket", tickets))), 1)

        with self.assertRaises(AccessDenied):
            await self.ticket_service.delete_ticket(token=cashier_token, ticket_id=ticket.id)

        deleted = await self.ticket_service.delete_ticket(token=self.admin_token, ticket_id=ticket.id)
        self.assertTrue(deleted)
