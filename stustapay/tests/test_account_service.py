# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.user import Privilege
from stustapay.core.service.account import AccountService
from stustapay.core.service.common.error import AccessDenied
from .common import BaseTestCase


class AccountServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        for user_tag_uid in range(1, 20):
            await self.db_conn.execute("insert into user_tag (uid) values ($1)", user_tag_uid)
        self.account_id = await self.db_conn.fetchval(
            "insert into account(user_tag_uid, type, name) values (1, 'private', 'account-1') returning id"
        )
        await self.create_terminal_token()

    async def test_switch_user_tag(self):
        acc = await self.account_service.get_account(token=self.admin_token, account_id=self.account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(1, acc.user_tag_uid)
        success = await self.account_service.switch_account_tag_uid_admin(
            token=self.admin_token, account_id=self.account_id, new_user_tag_uid=2
        )
        self.assertTrue(success)
        acc = await self.account_service.get_account(token=self.admin_token, account_id=self.account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(2, acc.user_tag_uid)
        n_history_entries = await self.db_pool.fetchval(
            "select count(*) from account_tag_association_history where account_id = $1", self.account_id
        )
        self.assertEqual(1, n_history_entries)

    async def test_free_ticket_grant_without_vouchers(self):
        volunteer_tag = await self.db_conn.fetchval("insert into user_tag (uid) values (1337) returning uid")
        grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag)

        with self.assertRaises(AccessDenied):
            await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)

        await self.user_service.update_user_privileges(
            token=self.admin_token,
            user_id=self.cashier.id,
            privileges=[Privilege.grant_free_tickets, Privilege.cashier],
        )
        success = await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)
        self.assertTrue(success)
        customer = await self.account_service.get_account_by_tag_uid(token=self.admin_token, user_tag_uid=volunteer_tag)
        self.assertEqual(customer.vouchers, 0)

        with self.assertRaises(AccessDenied):
            await self.account_service.grant_vouchers(token=self.terminal_token, user_tag_uid=volunteer_tag, vouchers=3)

        await self.user_service.update_user_privileges(
            token=self.admin_token,
            user_id=self.cashier.id,
            privileges=[Privilege.grant_free_tickets, Privilege.cashier, Privilege.grant_vouchers],
        )

        # lets grant the new volunteer tickets via the extra api
        account = await self.account_service.grant_vouchers(
            token=self.terminal_token, user_tag_uid=volunteer_tag, vouchers=3
        )
        self.assertIsNotNone(account)
        self.assertEqual(3, account.vouchers)

    async def test_free_ticket_grant_with_vouchers(self):
        await self.user_service.update_user_privileges(
            token=self.admin_token,
            user_id=self.cashier.id,
            privileges=[Privilege.grant_free_tickets, Privilege.cashier],
        )
        volunteer_tag = await self.db_conn.fetchval("insert into user_tag (uid) values (1337) returning uid")
        grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag, initial_voucher_amount=3)
        success = await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)
        self.assertTrue(success)
        customer = await self.account_service.get_account_by_tag_uid(token=self.admin_token, user_tag_uid=volunteer_tag)
        self.assertEqual(customer.vouchers, 3)
