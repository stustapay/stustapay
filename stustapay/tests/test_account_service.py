# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.till import NewTillProfile
from stustapay.core.schema.user import ADMIN_ROLE_NAME, NewUser, NewUserRole, Privilege
from stustapay.core.service.common.error import AccessDenied

from .common import TerminalTestCase


class AccountServiceTest(TerminalTestCase):
    async def test_switch_user_tag(self):
        user_tag_uid = 1887
        new_user_tag_uid = 1999
        await self.db_conn.execute("insert into user_tag (node_id, uid) values ($1, $2)", self.node_id, user_tag_uid)
        await self.db_conn.execute(
            "insert into user_tag (node_id, uid) values ($1, $2)", self.node_id, new_user_tag_uid
        )
        user = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(login="test-user", display_name="test-user", user_tag_uid=user_tag_uid, role_names=[]),
        )
        account_id = await self.db_conn.fetchval("select id from account where user_tag_uid = $1", user_tag_uid)

        acc = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(user_tag_uid, acc.user_tag_uid)
        await self.account_service.switch_account_tag_uid_admin(
            token=self.admin_token, account_id=account_id, new_user_tag_uid=new_user_tag_uid, comment="foobar"
        )
        acc = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(acc)
        self.assertEqual(new_user_tag_uid, acc.user_tag_uid)
        self.assertEqual(1, len(acc.tag_history))
        self.assertEqual("foobar", acc.tag_history[0].comment)
        user = await self.user_service.get_user(token=self.admin_token, user_id=user.id)
        self.assertEqual(new_user_tag_uid, user.user_tag_uid)

        user_tag_2 = await self.user_tag_service.get_user_tag_detail(
            token=self.admin_token, user_tag_uid=new_user_tag_uid
        )
        self.assertIsNotNone(user_tag_2)
        self.assertEqual(0, len(user_tag_2.account_history))

        user_tag_1 = await self.user_tag_service.get_user_tag_detail(token=self.admin_token, user_tag_uid=user_tag_uid)
        self.assertIsNotNone(user_tag_1)
        self.assertEqual(1, len(user_tag_1.account_history))
        self.assertEqual(acc.id, user_tag_1.account_history[0].account_id)

    async def test_free_ticket_grant_without_vouchers(self):
        voucher_role = await self.user_service.create_user_role(
            token=self.admin_token,
            new_role=NewUserRole(
                name="test-role", is_privileged=False, privileges=[Privilege.supervised_terminal_login]
            ),
        )
        await self.user_service.update_user_roles(
            token=self.admin_token,
            user_id=self.cashier.id,
            role_names=[voucher_role.name],
        )
        await self.till_service.profile.update_profile(
            token=self.admin_token,
            profile_id=self.till.active_profile_id,
            profile=NewTillProfile(
                name="test-profile",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
                allowed_role_names=[ADMIN_ROLE_NAME, "test-role"],
            ),
        )

        # after updating the cashier roles we need to log out and log in with the new role
        await self._login_supervised_user(user_tag_uid=self.cashier_tag_uid, user_role_id=voucher_role.id)

        volunteer_tag = await self.db_conn.fetchval(
            "insert into user_tag (node_id, uid) values ($1, 1337) returning uid", self.node_id
        )
        grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag)

        with self.assertRaises(AccessDenied):
            await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)

        await self.user_service.update_user_role_privileges(
            token=self.admin_token,
            role_id=voucher_role.id,
            is_privileged=False,
            privileges=[Privilege.grant_free_tickets],
        )

        success = await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)
        self.assertTrue(success)
        customer = await self.account_service.get_account_by_tag_uid(token=self.admin_token, user_tag_uid=volunteer_tag)
        self.assertEqual(customer.vouchers, 0)

        with self.assertRaises(AccessDenied):
            await self.account_service.grant_vouchers(token=self.terminal_token, user_tag_uid=volunteer_tag, vouchers=3)

        await self.user_service.update_user_role_privileges(
            token=self.admin_token,
            role_id=voucher_role.id,
            is_privileged=False,
            privileges=[Privilege.supervised_terminal_login, Privilege.grant_free_tickets, Privilege.grant_vouchers],
        )

        # let's grant the new volunteer tickets via the extra api
        account = await self.account_service.grant_vouchers(
            token=self.terminal_token, user_tag_uid=volunteer_tag, vouchers=3
        )
        self.assertIsNotNone(account)
        self.assertEqual(3, account.vouchers)

    async def test_free_ticket_grant_with_vouchers(self):
        voucher_role = await self.user_service.create_user_role(
            token=self.admin_token,
            new_role=NewUserRole(
                name="test-role", privileges=[Privilege.supervised_terminal_login, Privilege.grant_free_tickets]
            ),
        )
        await self.till_service.profile.update_profile(
            token=self.admin_token,
            profile_id=self.till.active_profile_id,
            profile=NewTillProfile(
                name="test-profile",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
                allowed_role_names=[ADMIN_ROLE_NAME, "test-role"],
            ),
        )

        await self.user_service.update_user_roles(
            token=self.admin_token,
            user_id=self.cashier.id,
            role_names=[voucher_role.name],
        )
        # after updating the cashier roles we need to log out and log in with the new role
        await self._login_supervised_user(user_tag_uid=self.cashier_tag_uid, user_role_id=voucher_role.id)

        volunteer_tag = await self.db_conn.fetchval(
            "insert into user_tag (node_id, uid) values ($1, 1337) returning uid", self.node_id
        )
        grant = NewFreeTicketGrant(user_tag_uid=volunteer_tag, initial_voucher_amount=3)
        success = await self.account_service.grant_free_tickets(token=self.terminal_token, new_free_ticket_grant=grant)
        self.assertTrue(success)
        customer = await self.account_service.get_account_by_tag_uid(token=self.admin_token, user_tag_uid=volunteer_tag)
        self.assertEqual(customer.vouchers, 3)

    async def test_account_comment_updates(self):
        await self.db_conn.execute("insert into user_tag (node_id, uid) values ($1, 1)", self.node_id)
        account_id = await self.db_conn.fetchval(
            "insert into account(node_id, user_tag_uid, type, name) values ($1, 1, 'private', 'account-1') returning id",
            self.node_id,
        )

        acc = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(acc)
        self.assertIsNone(acc.comment)

        await self.account_service.update_account_comment(
            token=self.admin_token, account_id=account_id, comment="foobar"
        )
        acc = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(acc)
        self.assertEqual("foobar", acc.comment)
