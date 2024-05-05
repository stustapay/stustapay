# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import logging
import random
import secrets
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import apply_revisions, reset_schema
from stustapay.core.schema.product import NewProduct, ProductRestriction
from stustapay.core.schema.tax_rate import NewTaxRate, TaxRate
from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.ticket import NewTicket
from stustapay.core.schema.till import (
    NewCashRegister,
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, NewNode, Node, ObjectType
from stustapay.core.schema.tse import NewTse, TseType
from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    NewUser,
    NewUserRole,
    NewUserToRole,
    Privilege,
    RoleToNode,
    User,
    UserRole,
)
from stustapay.core.schema.user_tag import NewUserTag, NewUserTagSecret
from stustapay.core.service.auth import AuthService
from stustapay.core.service.product import ProductService
from stustapay.core.service.tax_rate import TaxRateService, fetch_tax_rate_none
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.tree.service import create_event, create_node
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import UserService, associate_user_to_role
from stustapay.core.service.user_tag import create_user_tag_secret, create_user_tags
from stustapay.framework.database import Connection, create_db_pool

CASHIER_TAG_START = 1000
CUSTOMER_TAG_START = 100000

logger = logging.getLogger(__name__)


async def _create_tags_and_users(conn: Connection, user_service: UserService, event_node: Node, n_customer_tags: int):
    logger.info(f"Creating {n_customer_tags} tags")
    root_node = await fetch_node(conn=conn, node_id=ROOT_NODE_ID)
    assert root_node is not None and event_node is not None

    global_admin = await user_service.create_user_no_auth(
        conn=conn,
        node_id=ROOT_NODE_ID,
        new_user=NewUser(login="global-admin", display_name=""),
        roles=[RoleToNode(node_id=ROOT_NODE_ID, role_id=ADMIN_ROLE_ID)],
        password="admin",
    )

    admin_login = await user_service.login_user(  # pylint: disable=missing-kwoa
        conn=conn, username="global-admin", password="admin"
    )
    assert admin_login.success is not None
    admin_token = admin_login.success.token

    secret = await create_user_tag_secret(
        conn=conn,
        node_id=event_node.id,
        secret=NewUserTagSecret(
            key0="000102030405060708090a0b0c0d0e0f",
            key1="000102030405060708090a0b0c0d0e0f",
            description="dummy simulator event key",
        ),
    )

    finanzorga_role: UserRole = await user_service.create_user_role(
        conn=conn,
        token=admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="finanzorga",
            is_privileged=True,
            privileges=[
                Privilege.terminal_login,
                Privilege.node_administration,
                Privilege.cash_transport,
                Privilege.grant_vouchers,
                Privilege.user_management,
                Privilege.grant_free_tickets,
                Privilege.customer_management,
            ],
        ),
    )

    admin_tag = NewUserTag(pin="admin", secret_id=secret.id)
    await create_user_tags(conn=conn, node_id=event_node.id, tags=[admin_tag])
    node_admin = await user_service.create_user_no_auth(
        conn=conn,
        node_id=event_node.id,
        new_user=NewUser(
            login="admin", display_name="", user_tag_pin=admin_tag.pin, user_tag_uid=random.randint(1, 100000)
        ),
        password="admin",
    )
    await associate_user_to_role(
        conn=conn,
        node=event_node,
        current_user_id=global_admin.id,
        new_user_to_role=NewUserToRole(user_id=node_admin.id, role_id=ADMIN_ROLE_ID),
    )
    await associate_user_to_role(
        conn=conn,
        node=event_node,
        current_user_id=global_admin.id,
        new_user_to_role=NewUserToRole(user_id=node_admin.id, role_id=finanzorga_role.id),
    )

    finanzorga_tags = [NewUserTag(pin=secrets.token_hex(16), secret_id=secret.id) for _ in range(10, 16)]
    await create_user_tags(conn=conn, node_id=event_node.id, tags=finanzorga_tags)
    for i, finanzorga_tag in enumerate(finanzorga_tags):
        finanzorga_user = await user_service.create_user_no_auth(
            conn=conn,
            node_id=event_node.id,
            new_user=NewUser(
                login=f"Finanzorga {i + 1}",
                display_name="",
                user_tag_pin=finanzorga_tag.pin,
                user_tag_uid=random.randint(1, 10000000),
            ),
            password="admin",
        )
        await associate_user_to_role(
            conn=conn,
            node=event_node,
            current_user_id=global_admin.id,
            new_user_to_role=NewUserToRole(user_id=finanzorga_user.id, role_id=finanzorga_role.id),
        )

    customer_tags = [NewUserTag(pin=secrets.token_hex(16), secret_id=secret.id) for _ in range(n_customer_tags)]
    await create_user_tags(conn=conn, node_id=event_node.id, tags=customer_tags)

    return global_admin, admin_token


async def _create_admin_tills(
    conn: Connection,
    event_node_id: int,
    admin_token: str,
    terminal_service: TerminalService,
    till_service: TillService,
    n_admin_tills: int,
):
    node = await fetch_node(conn=conn, node_id=event_node_id)
    assert node is not None
    admin_layout = await till_service.layout.create_layout(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        layout=NewTillLayout(
            name="Admin",
            description="",
            button_ids=[],
        ),
    )
    admin_profile = await till_service.profile.create_profile(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        profile=NewTillProfile(
            name="Admin",
            description="",
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
            layout_id=admin_layout.id,
        ),
    )

    tills = [NewTill(name=f"Admin {i}", active_profile_id=admin_profile.id) for i in range(n_admin_tills)]
    for till in tills:
        terminal = await terminal_service.create_terminal(
            token=admin_token, node_id=event_node_id, terminal=NewTerminal(name=till.name, description="")
        )
        till.terminal_id = terminal.id
        await till_service.create_till(
            token=admin_token,
            node_id=event_node_id,
            till=till,
        )


async def _create_beverage_tills(
    conn: Connection,
    event_node_id: int,
    admin_token: str,
    terminal_service: TerminalService,
    product_service: ProductService,
    till_service: TillService,
    n_cocktail_tills: int,
    n_beer_tills: int,
    tax_rate_ust: TaxRate,
):
    beer_products = [
        NewProduct(
            name="Helles 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Helles 0.5l",
            price=2,
            price_in_vouchers=1,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Weißbier 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Weißbier 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Radler 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Radler 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Russ 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Russ 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Limonade 1.0l",
            price=4,
            price_in_vouchers=2,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
        ),
    ]
    cocktail_products = [
        NewProduct(
            name="Whiskey 1.0l",
            price=20,
            price_in_vouchers=10,
            tax_rate_id=tax_rate_ust.id,
            is_locked=True,
            restrictions=[ProductRestriction.under_16, ProductRestriction.under_18],
        ),
    ]
    node = await fetch_node(conn=conn, node_id=event_node_id)
    assert node is not None
    tax_none = await fetch_tax_rate_none(conn=conn, node=node)
    deposit_product = await product_service.create_product(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        product=NewProduct(name="Pfand", price=2, is_locked=True, is_returnable=True, tax_rate_id=tax_none.id),
    )
    deposit_button = await till_service.layout.create_button(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        button=NewTillButton(name=deposit_product.name, product_ids=[deposit_product.id]),
    )

    beer_buttons = []
    for beer_product in beer_products:
        product = await product_service.create_product(
            conn=conn,
            node_id=event_node_id,
            token=admin_token,
            product=beer_product,
        )
        button = await till_service.layout.create_button(
            conn=conn,
            node_id=event_node_id,
            token=admin_token,
            button=NewTillButton(name=product.name, product_ids=[product.id, deposit_product.id]),
        )
        beer_buttons.append(button)
    beer_layout = await till_service.layout.create_layout(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        layout=NewTillLayout(
            name="Bierkasse",
            description="",
            button_ids=[b.id for b in beer_buttons] + [deposit_button.id],
        ),
    )
    beer_profile = await till_service.profile.create_profile(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        profile=NewTillProfile(
            name="Bierkasse",
            description="",
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
            layout_id=beer_layout.id,
        ),
    )

    cocktail_buttons = []
    for cocktail_product in cocktail_products:
        product = await product_service.create_product(
            conn=conn,
            node_id=event_node_id,
            token=admin_token,
            product=cocktail_product,
        )
        button = await till_service.layout.create_button(
            conn=conn,
            node_id=event_node_id,
            token=admin_token,
            button=NewTillButton(name=product.name, product_ids=[product.id, deposit_product.id]),
        )
        cocktail_buttons.append(button)
    cocktail_layout = await till_service.layout.create_layout(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        layout=NewTillLayout(
            name="Cocktailkasse",
            description="",
            button_ids=[b.id for b in cocktail_buttons] + [deposit_button.id],
        ),
    )
    cocktail_profile = await till_service.profile.create_profile(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        profile=NewTillProfile(
            name="Cocktailkasse",
            description="",
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
            layout_id=cocktail_layout.id,
        ),
    )

    tills = [NewTill(name=f"Bierkasse {i}", active_profile_id=beer_profile.id) for i in range(n_beer_tills)] + [
        NewTill(name=f"Cocktailkasse {i}", active_profile_id=cocktail_profile.id) for i in range(n_cocktail_tills)
    ]
    for till in tills:
        terminal = await terminal_service.create_terminal(
            token=admin_token, node_id=event_node_id, terminal=NewTerminal(name=till.name, description="")
        )
        till.terminal_id = terminal.id
        await till_service.create_till(
            token=admin_token,
            node_id=event_node_id,
            till=till,
        )


async def _create_ticket_tills(
    conn: Connection,
    event_node_id: int,
    admin_token: str,
    till_service: TillService,
    ticket_service: TicketService,
    terminal_service: TerminalService,
    n_tills: int,
    tax_rate_ust: TaxRate,
):
    ticket = await ticket_service.create_ticket(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        ticket=NewTicket(
            name="Eintritt",
            price=12,
            tax_rate_id=tax_rate_ust.id,
            initial_top_up_amount=0,
            is_locked=True,
            restrictions=[],
        ),
    )
    layout = await till_service.layout.create_layout(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        layout=NewTillLayout(
            name="Eintrittskasse",
            description="",
            ticket_ids=[ticket.id],
        ),
    )
    profile = await till_service.profile.create_profile(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        profile=NewTillProfile(
            name="Eintrittskasse",
            description="",
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=True,
            layout_id=layout.id,
        ),
    )
    tills = [NewTill(name=f"Eintrittskasse {i}", active_profile_id=profile.id) for i in range(n_tills)]
    for till in tills:
        terminal = await terminal_service.create_terminal(
            token=admin_token, node_id=event_node_id, terminal=NewTerminal(name=till.name, description="")
        )
        till.terminal_id = terminal.id
        await till_service.create_till(
            token=admin_token,
            node_id=event_node_id,
            till=till,
        )


async def _create_topup_tills(
    conn: Connection,
    event_node_id: int,
    admin_token: str,
    till_service: TillService,
    terminal_service: TerminalService,
    n_tills: int,
):
    layout = await till_service.layout.create_layout(
        conn=conn,
        token=admin_token,
        node_id=event_node_id,
        layout=NewTillLayout(
            name="Aufladekasse",
            description="",
        ),
    )
    profile = await till_service.profile.create_profile(
        conn=conn,
        token=admin_token,
        node_id=event_node_id,
        profile=NewTillProfile(
            name="Aufladekasse",
            description="",
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=False,
            layout_id=layout.id,
        ),
    )
    tills = [NewTill(name=f"Aufladekasse {i}", active_profile_id=profile.id) for i in range(n_tills)]
    for till in tills:
        terminal = await terminal_service.create_terminal(
            token=admin_token, node_id=event_node_id, terminal=NewTerminal(name=till.name, description="")
        )
        till.terminal_id = terminal.id
        await till_service.create_till(
            token=admin_token,
            node_id=event_node_id,
            till=till,
        )


class DatabaseSetup:
    def __init__(
        self,
        config: Config,
        n_cashiers: Optional[int],
        n_tags: int,
        n_entry_tills: int,
        n_topup_tills: int,
        n_beer_tills: int,
        n_cocktail_tills: int,
    ):
        self.config = config
        self.n_cashiers = n_cashiers or int((n_topup_tills + n_beer_tills + n_cocktail_tills + n_entry_tills) * 1.5)
        self.n_tags = n_tags
        self.n_entry_tills = n_entry_tills
        self.n_topup_tills = n_topup_tills
        self.n_beer_tills = n_beer_tills
        self.n_cocktail_tills = n_cocktail_tills

        self.event_node_id: int = None  # type: ignore # initialized at the start of run()
        self.event_node: Node = None  # type: ignore # initialized at the start of run()

        self.db_pool: asyncpg.Pool | None = None

    async def _create_tills(self, conn: Connection, admin_token: str, n_tills: int, tax_rate_ust: TaxRate):
        assert self.db_pool is not None
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        till_service = TillService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        product_service = ProductService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        ticket_service = TicketService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        terminal_service = TerminalService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)

        logger.info(f"Creating {n_tills} tills")
        await _create_admin_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            till_service=till_service,
            terminal_service=terminal_service,
            n_admin_tills=10,
        )
        await _create_beverage_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            product_service=product_service,
            till_service=till_service,
            n_cocktail_tills=self.n_cocktail_tills,
            terminal_service=terminal_service,
            n_beer_tills=self.n_beer_tills,
            tax_rate_ust=tax_rate_ust,
        )
        await _create_topup_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            till_service=till_service,
            n_tills=self.n_topup_tills,
            terminal_service=terminal_service,
        )
        await _create_ticket_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            ticket_service=ticket_service,
            till_service=till_service,
            n_tills=self.n_entry_tills,
            tax_rate_ust=tax_rate_ust,
            terminal_service=terminal_service,
        )
        for i in range(n_tills):
            await till_service.register.create_cash_register(
                token=admin_token, node_id=self.event_node_id, new_register=NewCashRegister(name=f"Blechkasse {i}")
            )

        await till_service.register.create_cash_register_stockings(
            token=admin_token,
            node_id=self.event_node_id,
            stocking=NewCashRegisterStocking(name="Stocking", euro20=2, euro10=1),
        )

    async def _create_cashiers(
        self, conn: Connection, admin_user: User, user_service: UserService, admin_token: str, n_cashiers: int
    ):
        logger.info(f"Creating {n_cashiers} cashiers")
        cashier_role: UserRole = await user_service.create_user_role(
            conn=conn,
            token=admin_token,
            node_id=self.event_node_id,
            new_role=NewUserRole(
                name="cashier",
                is_privileged=False,
                privileges=[Privilege.supervised_terminal_login, Privilege.can_book_orders],
            ),
        )
        for i in range(n_cashiers):
            cashier_tag_pin = await conn.fetchval(
                "insert into user_tag (node_id, pin) values ($1, $2) returning pin",
                self.event_node_id,
                secrets.token_hex(16),
            )
            cashier = await user_service.create_user_no_auth(
                conn=conn,
                node_id=self.event_node_id,
                new_user=NewUser(
                    login=f"Cashier {i}",
                    display_name=f"Cashier {i}",
                    user_tag_pin=cashier_tag_pin,
                    user_tag_uid=random.randint(1, 1000000),
                ),
            )
            await associate_user_to_role(
                conn=conn,
                node=self.event_node,
                current_user_id=admin_user.id,
                new_user_to_role=NewUserToRole(user_id=cashier.id, role_id=cashier_role.id),
            )

    async def _create_tse(self, conn: Connection, admin_token: str):
        assert self.db_pool is not None
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        tse_service = TseService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        await tse_service.create_tse(
            conn=conn,
            node_id=self.event_node_id,
            token=admin_token,
            new_tse=NewTse(
                name="tse1",
                serial="84ba2997f8fbf9d0feee48c7ba5812d6d1e37c33fdb11cdb06eb849b1336b1c7",
                type=TseType.diebold_nixdorf,
                ws_url="http://localhost:10001",
                ws_timeout=5,
                password="12345",
            ),
        )

    async def run(self):
        self.db_pool = await create_db_pool(self.config.database)
        await reset_schema(db_pool=self.db_pool)
        await apply_revisions(db_pool=self.db_pool)
        n_tills = self.n_entry_tills + self.n_topup_tills + self.n_beer_tills + self.n_cocktail_tills
        n_cashiers = max(int(n_tills * 1.5), self.n_cashiers or 0)

        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        user_service = UserService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        tax_service = TaxRateService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)

        async with self.db_pool.acquire() as conn:
            simulated_folder_node = await create_node(
                conn=conn,
                parent_id=ROOT_NODE_ID,
                new_node=NewNode(
                    name="SIMULATOR",
                    description="",
                    forbidden_objects_at_node=[
                        ObjectType.user,
                    ],
                ),
            )
            event_node = await create_event(
                conn=conn,
                parent_id=simulated_folder_node.id,
                event=NewEvent(
                    name="SSC-Test",
                    description="",
                    currency_identifier="EUR",
                    max_account_balance=150,
                    customer_portal_url="http://localhost:4300",
                    customer_portal_about_page_url="http://localhost:4300/about",
                    customer_portal_data_privacy_url="http://localhost:4300/privacy",
                    customer_portal_contact_email="test@test.com",
                    forbidden_objects_in_subtree=[
                        ObjectType.ticket,
                        ObjectType.terminal,
                        ObjectType.product,
                        ObjectType.tax_rate,
                    ],
                    ust_id="UST ID",
                    bon_issuer="Issuer",
                    bon_address="Address",
                    bon_title="Title",
                    sepa_enabled=True,
                    sepa_sender_name="Organizer",
                    sepa_sender_iban="DE89370400440532013000",
                    sepa_description="FestivalName, TagID: {user_tag_uid}",
                    sepa_allowed_country_codes=["DE"],
                ),
            )
            beer_team_node = await create_node(
                conn=conn,
                parent_id=event_node.id,
                new_node=NewNode(
                    name="Bierteam",
                    description="",
                ),
            )
            await create_node(
                conn=conn,
                parent_id=beer_team_node.id,
                new_node=NewNode(
                    name="Weißbierinsel",
                    description="",
                ),
            )
            await create_node(
                conn=conn,
                parent_id=event_node.id,
                new_node=NewNode(
                    name="Cocktailstand",
                    description="",
                ),
            )
            self.event_node_id = event_node.id
            self.event_node = event_node

            admin, admin_token = await _create_tags_and_users(
                conn=conn, user_service=user_service, event_node=self.event_node, n_customer_tags=self.n_tags
            )
            tax_rate_ust = await tax_service.create_tax_rate(
                conn=conn,
                token=admin_token,
                node_id=self.event_node_id,
                tax_rate=NewTaxRate(name="ust", description="Umsatzsteuer", rate=0.19),
            )
            await self._create_tills(conn=conn, admin_token=admin_token, n_tills=n_tills, tax_rate_ust=tax_rate_ust)
            await self._create_cashiers(
                conn=conn, user_service=user_service, admin_user=admin, admin_token=admin_token, n_cashiers=n_cashiers
            )
            await self._create_tse(conn=conn, admin_token=admin_token)
