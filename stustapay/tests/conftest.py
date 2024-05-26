# pylint: disable=redefined-outer-name
import asyncio
import os
import random
import secrets
from dataclasses import dataclass
from typing import AsyncGenerator, Awaitable, Protocol

import asyncpg
import pytest

from stustapay.core import database
from stustapay.core.config import (
    AdministrationApiConfig,
    Config,
    CoreConfig,
    CustomerPortalApiConfig,
    TerminalApiConfig,
)
from stustapay.core.schema.product import ProductRestriction
from stustapay.core.schema.tax_rate import NewTaxRate, TaxRate
from stustapay.core.schema.terminal import NewTerminal, Terminal
from stustapay.core.schema.till import (
    NewTill,
    NewTillLayout,
    NewTillProfile,
    Till,
    TillLayout,
    TillProfile,
)
from stustapay.core.schema.tree import (
    ROOT_NODE_ID,
    NewEvent,
    Node,
    RestrictedEventSettings,
)
from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    Privilege,
    RoleToNode,
    User,
    UserRole,
)
from stustapay.core.service.account import AccountService
from stustapay.core.service.auth import AuthService
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.mail import MailService
from stustapay.core.service.order import OrderService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService, fetch_tax_rate_none
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.core.service.tree.service import TreeService, create_event
from stustapay.core.service.user import UserService, associate_user_to_role
from stustapay.core.service.user_tag import UserTagService
from stustapay.framework.database import Connection, DatabaseConfig, create_db_pool


def get_test_db_config() -> DatabaseConfig:
    return DatabaseConfig(
        user="stustapay_test", #os.environ.get("TEST_DB_USER", None),
        password="stustapay_test", #os.environ.get("TEST_DB_PASSWORD", None),
        host="localhost", #os.environ.get("TEST_DB_HOST", None),
        port=5434, #int(os.environ.get("TEST_DB_PORT", 0)) or None,
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
    customerportal=CustomerPortalApiConfig(
        base_url="http://localhost:8082",
    ),
    database=get_test_db_config(),
)


@pytest.fixture(scope="session")
def event_loop():
    return asyncio.get_event_loop()


@pytest.fixture(scope="session")
def config() -> Config:
    return TEST_CONFIG


@pytest.fixture(scope="session", autouse=True)
async def setup_test_db_pool(config: Config) -> asyncpg.Pool:
    pool = await create_db_pool(cfg=config.database, n_connections=10)

    await database.reset_schema(pool)
    await database.apply_revisions(pool)
    return pool


@pytest.fixture
async def db_connection(setup_test_db_pool: asyncpg.Pool) -> AsyncGenerator[Connection, None]:
    async with setup_test_db_pool.acquire() as conn:
        yield conn


@pytest.fixture
async def event_node(db_connection: Connection) -> Node:
    return await create_event(
        conn=db_connection,
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
            email_enabled=False,
            email_default_sender=None,
            email_smtp_host=None,
            email_smtp_port=None,
            email_smtp_username=None,
            email_smtp_password=None,
            payout_done_subject="[StuStaPay] Payout Completed",
            payout_done_message="Thank you for your patience. The payout process has been completed and the funds should arrive within the next days to your specified bank account.",
            payout_registered_subject="[StuStaPay] Registered for Payout",
            payout_registered_message="Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transferred to the specified bank account in our next manual payout. You will receive another email once we transferred the funds.",
            payout_sender=None,
        ),
    )


@pytest.fixture
async def event(db_connection: Connection, event_node: Node) -> RestrictedEventSettings:
    return await fetch_restricted_event_settings_for_node(conn=db_connection, node_id=event_node.id)


@pytest.fixture
async def user_tag_secret(db_connection: Connection, event_node: Node) -> int:
    user_tag_secret_id = await db_connection.fetchval(
        "insert into user_tag_secret (node_id, key0, key1) overriding system value values "
        "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
        "returning id",
        event_node.id,
    )
    return user_tag_secret_id


@dataclass
class UserTag:
    id: int
    uid: int
    pin: str


class CreateRandomUserTag(Protocol):
    def __call__(self, restriction: ProductRestriction | None = None) -> Awaitable[UserTag]: ...


@pytest.fixture
async def create_random_user_tag(
    db_connection: Connection, event_node: Node, user_tag_secret: int
) -> CreateRandomUserTag:
    async def func(restriction: ProductRestriction | None = None) -> UserTag:
        while True:
            uid = random.randint(1, 2**32 - 1)
            pin = secrets.token_hex(16)
            try:
                user_tag_id = await db_connection.fetchval(
                    "insert into user_tag (node_id, secret_id, restriction, pin) values ($1, $2, $3, $4) "
                    "returning id",
                    event_node.id,
                    user_tag_secret,
                    restriction.name if restriction is not None else None,
                    pin,
                )
                return UserTag(id=user_tag_id, uid=uid, pin=pin)
            except asyncpg.DataError:
                pass

    return func


@pytest.fixture(scope="session")
def auth_service(setup_test_db_pool: asyncpg.Pool, config: Config) -> AuthService:
    return AuthService(db_pool=setup_test_db_pool, config=config)


@pytest.fixture(scope="session")
async def user_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> UserService:
    return UserService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def till_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> TillService:
    return TillService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def account_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> AccountService:
    return AccountService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def config_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> ConfigService:
    return ConfigService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def user_tag_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> UserTagService:
    return UserTagService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def product_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> ProductService:
    return ProductService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def ticket_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> TicketService:
    return TicketService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def tree_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> TreeService:
    return TreeService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def cashier_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> CashierService:
    return CashierService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def order_service(setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService) -> OrderService:
    return OrderService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def terminal_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> TerminalService:
    return TerminalService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def tax_rate_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService
) -> TaxRateService:
    return TaxRateService(db_pool=setup_test_db_pool, config=config, auth_service=auth_service)


@pytest.fixture(scope="session")
async def customer_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService
) -> CustomerService:
    return CustomerService(
        db_pool=setup_test_db_pool, config=config, auth_service=auth_service, config_service=config_service
    )

@pytest.fixture(scope="session")
async def mail_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService
) -> MailService:
    return MailService(
        db_pool=setup_test_db_pool, config=config
    )


@pytest.fixture
async def global_admin_user(
    db_connection: Connection,
    user_service: UserService,
) -> tuple[User, str]:
    node = await fetch_node(conn=db_connection, node_id=ROOT_NODE_ID)
    assert node is not None
    password = "rolf"
    admin_user = await user_service.create_user_no_auth(
        node_id=ROOT_NODE_ID,
        new_user=NewUser(
            login=f"test-global-admin-user {secrets.token_hex(16)}",
            description="",
            display_name="Admin",
        ),
        roles=[RoleToNode(node_id=ROOT_NODE_ID, role_id=ADMIN_ROLE_ID)],
        password=password,
    )
    return admin_user, password


@pytest.fixture
async def global_admin_token(user_service: UserService, global_admin_user: tuple[User, str]) -> str:
    user, password = global_admin_user
    result = await user_service.login_user(username=user.login, password=password)
    assert result.success is not None
    admin_token = result.success.token
    await user_service.update_user_role_privileges(
        token=admin_token,
        node_id=ROOT_NODE_ID,
        role_id=ADMIN_ROLE_ID,
        is_privileged=True,
        privileges=[
            Privilege.user_management,
            Privilege.payout_management,
            Privilege.view_node_stats,
            Privilege.allow_privileged_role_assignment,
            Privilege.node_administration,
            Privilege.cash_transport,
            Privilege.customer_management,
            Privilege.terminal_login,
            Privilege.can_book_orders,
            Privilege.grant_vouchers,
            Privilege.grant_free_tickets,
            Privilege.create_user,
        ],
    )
    return admin_token


@pytest.fixture
async def event_admin_tag(
    create_random_user_tag: CreateRandomUserTag,
) -> UserTag:
    return await create_random_user_tag()


@pytest.fixture
async def event_admin_user(
    user_service: UserService,
    event_admin_tag: UserTag,
    global_admin_token: str,
    event_node: Node,
) -> tuple[User, str]:
    password = "rolf"
    admin_user = await user_service.create_user(
        node_id=event_node.id,
        token=global_admin_token,
        new_user=NewUser(
            login=f"test-admin-user {secrets.token_hex(16)}",
            description="",
            display_name="Admin",
            user_tag_uid=event_admin_tag.uid,
            user_tag_pin=event_admin_tag.pin,
        ),
        password=password,
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=admin_user.id, role_ids=[ADMIN_ROLE_ID]),
    )
    return admin_user, password


@pytest.fixture
async def event_admin_token(user_service: UserService, event_admin_user: tuple[User, str]) -> str:
    user, password = event_admin_user
    result = await user_service.login_user(username=user.login, password=password)
    assert result.success is not None
    return result.success.token


@pytest.fixture
async def tax_rate_none(db_connection: Connection, event_node: Node) -> TaxRate:
    return await fetch_tax_rate_none(conn=db_connection, node=event_node)


@pytest.fixture
async def tax_rate_ust(tax_rate_service: TaxRateService, event_admin_token: str, event_node: Node) -> TaxRate:
    return await tax_rate_service.create_tax_rate(
        token=event_admin_token, node_id=event_node.id, tax_rate=NewTaxRate(name="ust", description="", rate=0.19)
    )


class Cashier(User):
    cashier_account_id: int
    user_tag_uid: int
    cashier_role: UserRole
    token: str


@pytest.fixture
async def cashier(
    db_connection: Connection,
    event_admin_token: str,
    event_admin_user: tuple[User, str],
    event_node: Node,
    user_service: UserService,
    create_random_user_tag: CreateRandomUserTag,
) -> Cashier:
    admin, _ = event_admin_user
    cashier_tag = await create_random_user_tag()
    cashier_role: UserRole = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="cashier",
            is_privileged=False,
            privileges=[Privilege.can_book_orders, Privilege.supervised_terminal_login],
        ),
    )
    cashier_user: User = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"test-cashier-user-{secrets.token_hex(16)}",
            user_tag_uid=cashier_tag.uid,
            user_tag_pin=cashier_tag.pin,
            description="",
            display_name="Cashier",
        ),
        password="rolf",
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=admin.id,
        user_id=cashier_user.id,
        role_id=cashier_role.id,
    )
    updated_cashier = await user_service.get_user(
        token=event_admin_token, node_id=event_node.id, user_id=cashier_user.id
    )
    assert updated_cashier is not None
    login_result = await user_service.login_user(username=updated_cashier.login, password="rolf")
    assert login_result.success is not None
    cashier_token = login_result.success.token
    cashier_as_dict = updated_cashier.model_dump()
    cashier_as_dict.update({"token": cashier_token, "cashier_role": cashier_role})
    cashier = Cashier.model_validate(cashier_as_dict)

    return cashier


@pytest.fixture
async def till_layout(
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
) -> TillLayout:
    return await till_service.layout.create_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout=NewTillLayout(name="test-layout", description="", button_ids=[]),
    )


@pytest.fixture
async def till_profile(
    till_service: TillService, till_layout: TillLayout, event_admin_token: str, event_node: Node
) -> TillProfile:
    return await till_service.profile.create_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile=NewTillProfile(
            name="test-profile",
            description="",
            layout_id=till_layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
        ),
    )


@pytest.fixture
async def terminal(terminal_service: TerminalService, event_admin_token: str, event_node: Node) -> Terminal:
    return await terminal_service.create_terminal(
        token=event_admin_token, node_id=event_node.id, terminal=NewTerminal(name="Test Terminal", description="")
    )


@pytest.fixture
async def till(
    till_service: TillService, till_profile: TillProfile, event_admin_token: str, event_node: Node, terminal: Terminal
) -> Till:
    return await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(name="test-till", active_profile_id=till_profile.id, terminal_id=terminal.id),
    )
