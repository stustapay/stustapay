# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import logging
import os
import random
import secrets
import threading
from pathlib import Path
from unittest import IsolatedAsyncioTestCase as TestCase

import asyncpg
from asyncpg.pool import Pool

from stustapay.core import database
from stustapay.core.config import (
    AdministrationApiConfig,
    BonConfig,
    Config,
    CoreConfig,
    CustomerPortalApiConfig,
    DatabaseConfig,
    TerminalApiConfig,
)
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.product import NewProduct, ProductRestriction
from stustapay.core.schema.tax_rate import NewTaxRate
from stustapay.core.schema.till import (
    NewCashRegister,
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.schema.tree import ALL_OBJECT_TYPES, ROOT_NODE_ID, NewEvent
from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    ADMIN_ROLE_NAME,
    NewUser,
    NewUserRole,
    Privilege,
    User,
    UserRole,
    UserTag,
)
from stustapay.core.service.account import AccountService, get_system_account_for_node
from stustapay.core.service.auth import AuthService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService, fetch_tax_rate_none
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.service import create_event
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import UserTagService
from stustapay.framework.database import Connection, create_db_pool


def get_test_db_config() -> DatabaseConfig:
    return DatabaseConfig(
        user=os.environ.get("TEST_DB_USER", None),
        password=os.environ.get("TEST_DB_PASSWORD", None),
        host=os.environ.get("TEST_DB_HOST", None),
        port=int(os.environ.get("TEST_DB_PORT", 0)) or None,
        dbname=os.environ.get("TEST_DB_DATABASE", "stustapay_test"),
    )


# input structure for core.config.Config
TEST_CONFIG = Config(
    core=CoreConfig(secret_key="stuff1234"),
    administration=AdministrationApiConfig(
        base_url="http://localhost:8081",
        host="localhost",
        port=8081,
    ),
    terminalserver=TerminalApiConfig(
        base_url="http://localhost:8080",
        host="localhost",
        port=8080,
    ),
    customer_portal=CustomerPortalApiConfig(
        base_url="http://localhost:8082",
        base_bon_url="https://bon.stustapay.de/{bon_output_file}",
    ),
    bon=BonConfig(output_folder=Path("tmp")),
    database=get_test_db_config(),
)


test_database_lock = threading.Lock()
schema_is_applied = False


async def get_test_db() -> Pool:
    """
    get a connection pool to the test database
    """
    global schema_is_applied  # pylint: disable=global-statement
    with test_database_lock:
        pool = await create_db_pool(cfg=TEST_CONFIG.database, n_connections=2)

        if not schema_is_applied:
            await database.reset_schema(pool)
            await database.apply_revisions(pool)
            schema_is_applied = True

        return pool


class Cashier(User):
    cashier_account_id: int
    user_tag_uid: int


class Finanzorga(Cashier):
    transport_account_id: int


class BaseTestCase(TestCase):
    def __init__(self, *args, log_level=logging.DEBUG, **kwargs):
        super().__init__(*args, **kwargs)
        logging.basicConfig(level=log_level)

    async def create_random_user_tag(
        self, *, pin: str | None = None, restriction: ProductRestriction | None = None
    ) -> int:
        while True:
            uid = random.randint(1, 2**32 - 1)
            try:
                user_tag_uid = await self.db_conn.fetchval(
                    "insert into user_tag (node_id, uid, secret_id, restriction, pin) values ($1, $2, $3, $4, $5) "
                    "returning uid",
                    self.node_id,
                    uid,
                    self.user_tag_secret_id,
                    restriction.name if restriction is not None else None,
                    pin,
                )
                return int(user_tag_uid)
            except asyncpg.DataError:
                pass

    async def create_cashier(self) -> tuple[Cashier, UserRole, str]:
        cashier_role: UserRole = await self.user_service.create_user_role(
            token=self.admin_token,
            node_id=self.node_id,
            new_role=NewUserRole(
                name="cashier",
                is_privileged=False,
                privileges=[Privilege.can_book_orders, Privilege.supervised_terminal_login],
            ),
        )
        cashier_tag_uid = await self.create_random_user_tag()
        cashier_user: User = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login=f"test-cashier-user-{secrets.token_hex(16)}",
                user_tag_uid=cashier_tag_uid,
                description="",
                role_names=[cashier_role.name],
                display_name="Cashier",
            ),
            password="rolf",
        )
        cashier = Cashier.model_validate(cashier_user.model_dump())
        cashier_token = (await self.user_service.login_user(username=cashier.login, password="rolf")).token

        return cashier, cashier_role, cashier_token

    async def create_finanzorga(self, cashier_role_name: str | None = None) -> tuple[Finanzorga, UserRole]:
        finanzorga_tag_uid = await self.create_random_user_tag()
        finanzorga_role = await self.user_service.create_user_role(
            token=self.admin_token,
            node_id=self.node_id,
            new_role=NewUserRole(
                name="finanzorga",
                is_privileged=True,
                privileges=[
                    Privilege.node_administration,
                    Privilege.terminal_login,
                    Privilege.user_management,
                    Privilege.grant_free_tickets,
                    Privilege.grant_vouchers,
                    Privilege.cash_transport,
                ],
            ),
        )
        finanzorga_user: User = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login=f"Finanzorga {secrets.token_hex(16)}",
                description="",
                role_names=[finanzorga_role.name, cashier_role_name]
                if cashier_role_name is not None
                else [finanzorga_role.name],
                user_tag_uid=finanzorga_tag_uid,
                display_name="Finanzorga",
            ),
        )
        finanzorga = Finanzorga.model_validate(finanzorga_user.model_dump())
        return finanzorga, finanzorga_role

    async def asyncSetUp(self) -> None:
        self.db_pool = await get_test_db()
        self.db_conn: Connection = await self.db_pool.acquire()

        self.event_node = await create_event(
            conn=self.db_conn,
            parent_id=ROOT_NODE_ID,
            event=NewEvent(
                name=secrets.token_hex(16),
                description="",
                customer_portal_url="http://localhost:4300",
                customer_portal_contact_email="test@test.support.test.com",
                customer_portal_about_page_url="",
                customer_portal_data_privacy_url="",
                currency_identifier="EUR",
                sepa_enabled=True,
                sepa_sender_name="Event Foobar",
                sepa_description="foobar {user_tag_uid}",
                sepa_sender_iban="DE89370400440532013000",
                sepa_allowed_country_codes=["DE"],
                allowed_objects_at_node=ALL_OBJECT_TYPES,
                allowed_objects_in_subtree=ALL_OBJECT_TYPES,
                bon_title="",
                bon_issuer="",
                bon_address="",
                max_account_balance=150,
                sumup_topup_enabled=False,
                sumup_payment_enabled=False,
                sumup_affiliate_key="",
                sumup_api_key="",
                sumup_merchant_code="",
                ust_id="",
            ),
        )
        self.node_id = self.event_node.id
        self.node = self.event_node
        assert self.event_node.event is not None
        self.event = self.event_node.event

        self.user_tag_secret_id = await self.db_conn.fetchval(
            "insert into user_tag_secret (node_id, key0, key1) overriding system value values "
            "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
            "returning id",
            self.node_id,
        )

        self.test_config = TEST_CONFIG

        self.auth_service = AuthService(db_pool=self.db_pool, config=self.test_config)
        self.user_service = UserService(db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service)
        self.account_service = AccountService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.user_tag_service = UserTagService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.till_service = TillService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
        )
        self.tax_rate_service = TaxRateService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
        )

        self.admin_tag_uid = await self.create_random_user_tag()
        self.admin_user = await self.user_service.create_user_no_auth(
            node_id=self.node_id,
            new_user=NewUser(
                login=f"test-admin-user {secrets.token_hex(16)}",
                description="",
                role_names=[ADMIN_ROLE_NAME],
                display_name="Admin",
                user_tag_uid=self.admin_tag_uid,
            ),
            password="rolf",
        )
        self.admin_token = (await self.user_service.login_user(username=self.admin_user.login, password="rolf")).token
        # TODO: tree, this has to be replaced as soon as we have proper tree visibility rules
        self.global_admin_token = self.admin_token

        self.tax_rate_none = await fetch_tax_rate_none(conn=self.db_conn, node=self.event_node)
        self.tax_rate_ust = await self.tax_rate_service.create_tax_rate(
            token=self.admin_token, node_id=self.node_id, tax_rate=NewTaxRate(name="ust", description="", rate=0.19)
        )

    async def _get_account_balance(self, account_id: int) -> float:
        account = await self.account_service.get_account(token=self.admin_token, account_id=account_id)
        self.assertIsNotNone(account)
        return account.balance

    async def _assert_account_balance(self, account_id: int, expected_balance: float):
        balance = await self._get_account_balance(account_id=account_id)
        self.assertEqual(expected_balance, balance)

    async def _get_system_account_balance(self, account_type: AccountType):
        account = await get_system_account_for_node(conn=self.db_conn, node=self.node, account_type=account_type)
        return account.balance

    async def _assert_system_account_balance(self, account_type: AccountType, expected_balance: float):
        balance = await self._get_system_account_balance(account_type=account_type)
        self.assertEqual(expected_balance, balance)

    async def asyncTearDown(self) -> None:
        await super().asyncTearDown()
        await self.db_conn.close()
        await self.db_pool.close()


class TerminalTestCase(BaseTestCase):
    async def _login_supervised_user(self, user_tag_uid: int, user_role_id: int):
        await self.till_service.logout_user(token=self.terminal_token)
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=self.admin_tag_uid), user_role_id=ADMIN_ROLE_ID
        )
        await self.till_service.login_user(
            token=self.terminal_token, user_tag=UserTag(uid=user_tag_uid), user_role_id=user_role_id
        )

    async def create_terminal(self, name: str) -> str:
        till = await self.till_service.create_till(
            token=self.admin_token,
            till=NewTill(
                name=name,
                active_profile_id=self.till_profile.id,
            ),
        )
        return (await self.till_service.register_terminal(registration_uuid=till.registration_uuid)).token

    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.customer_tag_uid = await self.create_random_user_tag()
        await self.db_conn.execute(
            "insert into account (node_id, user_tag_uid, type, balance) values ($1, $2, $3, 100)",
            self.node_id,
            self.customer_tag_uid,
            AccountType.private.name,
        )

        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )
        self.product = await self.product_service.create_product(
            token=self.admin_token,
            node_id=self.node_id,
            product=NewProduct(
                name="Helles",
                price=3,
                tax_rate_id=self.tax_rate_ust.id,
                is_locked=True,
                fixed_price=True,
                restrictions=[],
                is_returnable=False,
            ),
        )
        self.till_button = await self.till_service.layout.create_button(
            token=self.admin_token, button=NewTillButton(name="Helles", product_ids=[self.product.id])
        )
        self.till_layout = await self.till_service.layout.create_layout(
            token=self.admin_token,
            node_id=self.node_id,
            layout=NewTillLayout(name="test-layout", description="", button_ids=[self.till_button.id]),
        )
        self.till_profile = await self.till_service.profile.create_profile(
            token=self.admin_token,
            node_id=self.node_id,
            profile=NewTillProfile(
                name="test-profile",
                description="",
                layout_id=self.till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
            ),
        )
        self.till = await self.till_service.create_till(
            token=self.admin_token,
            node_id=self.node_id,
            till=NewTill(
                name="test-till",
                active_profile_id=self.till_profile.id,
            ),
        )
        self.terminal_token = (
            await self.till_service.register_terminal(registration_uuid=self.till.registration_uuid)
        ).token
        self.register = await self.till_service.register.create_cash_register(
            node_id=self.node_id, token=self.admin_token, new_register=NewCashRegister(name="Lade")
        )
        await self._login_supervised_user(user_tag_uid=self.admin_tag_uid, user_role_id=ADMIN_ROLE_ID)
        self.stocking = await self.till_service.register.create_cash_register_stockings(
            node_id=self.node_id,
            token=self.admin_token,
            stocking=NewCashRegisterStocking(name="My fancy stocking"),
        )
        self.cashier, self.cashier_role, self.cashier_token = await self.create_cashier()
        await self.till_service.register.stock_up_cash_register(
            token=self.terminal_token,
            cashier_tag_uid=self.cashier.user_tag_uid,
            stocking_id=self.stocking.id,
            cash_register_id=self.register.id,
        )
        # log in the cashier user
        await self._login_supervised_user(user_tag_uid=self.cashier.user_tag_uid, user_role_id=self.cashier_role.id)
