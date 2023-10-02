# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import logging
from typing import Optional

from stustapay.core.config import Config
from stustapay.core.database import apply_revisions, reset_schema
from stustapay.core.schema.product import (
    TICKET_PRODUCT_ID,
    NewProduct,
    ProductRestriction,
)
from stustapay.core.schema.ticket import NewTicket
from stustapay.core.schema.till import (
    NewCashRegister,
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.schema.tree import ALL_OBJECT_TYPES, ROOT_NODE_ID, NewEvent
from stustapay.core.schema.tse import NewTse, TseType
from stustapay.core.schema.user import CASHIER_ROLE_NAME, NewUser
from stustapay.core.schema.user_tag import NewUserTag, NewUserTagSecret
from stustapay.core.service.auth import AuthService
from stustapay.core.service.product import ProductService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.service import create_event
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import create_user_tag_secret, create_user_tags
from stustapay.framework.database import Connection, create_db_pool

CASHIER_TAG_START = 1000
CUSTOMER_TAG_START = 100000

logger = logging.getLogger(__name__)


async def _create_tags_and_users(conn: Connection, user_service: UserService, event_node_id: int, n_customer_tags: int):
    logger.info(f"Creating {n_customer_tags} tags")

    secret = await create_user_tag_secret(
        conn=conn,
        node_id=event_node_id,
        secret=NewUserTagSecret(
            key0="000102030405060708090a0b0c0d0e0f",
            key1="000102030405060708090a0b0c0d0e0f",
            description="dummy simulator event key",
        ),
    )

    admin_tag = NewUserTag(uid=1, secret_id=secret.id)
    await create_user_tags(conn=conn, node_id=event_node_id, tags=[admin_tag])
    await user_service.create_user_no_auth(
        conn=conn,
        node_id=event_node_id,
        new_user=NewUser(
            login="admin", display_name="", user_tag_uid=admin_tag.uid, role_names=["admin", "finanzorga"]
        ),
        password="admin",
    )

    finanzorga_tags = [NewUserTag(uid=i, secret_id=secret.id) for i in range(10, 16)]
    await create_user_tags(conn=conn, node_id=event_node_id, tags=finanzorga_tags)
    for i, finanzorga_tag in enumerate(finanzorga_tags):
        await user_service.create_user_no_auth(
            conn=conn,
            node_id=event_node_id,
            new_user=NewUser(
                login=f"Finanzorga {i + 1}", display_name="", user_tag_uid=finanzorga_tag.uid, role_names=["finanzorga"]
            ),
            password="admin",
        )

    customer_tags = [
        NewUserTag(uid=i + CUSTOMER_TAG_START, pin="pin", secret_id=secret.id) for i in range(n_customer_tags)
    ]
    await create_user_tags(conn=conn, node_id=event_node_id, tags=customer_tags)


async def _create_beverage_tills(
    conn: Connection,
    event_node_id: int,
    admin_token: str,
    product_service: ProductService,
    till_service: TillService,
    n_cocktail_tills: int,
    n_beer_tills: int,
):
    beer_products = [
        NewProduct(
            name="Helles 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Helles 0.5l",
            price=2,
            price_in_vouchers=1,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Weißbier 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Weißbier 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Radler 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Radler 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Russ 1.0l",
            price=5,
            price_in_vouchers=2,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Russ 0.5l",
            price=3,
            price_in_vouchers=1,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16],
        ),
        NewProduct(
            name="Limonade 1.0l",
            price=4,
            price_in_vouchers=2,
            tax_name="ust",
            is_locked=True,
        ),
    ]
    cocktail_products = [
        NewProduct(
            name="Whiskey 1.0l",
            price=20,
            price_in_vouchers=10,
            tax_name="ust",
            is_locked=True,
            restrictions=[ProductRestriction.under_16, ProductRestriction.under_18],
        ),
    ]
    deposit_product = await product_service.create_product(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        product=NewProduct(name="Pfand", price=2, is_locked=True, is_returnable=True, tax_name="none"),
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
            allowed_role_names=["admin", "finanzorga", "cashier"],
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
            allowed_role_names=["admin", "finanzorga", "cashier"],
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
    n_tills: int,
):
    ticket = await ticket_service.create_ticket(
        conn=conn,
        node_id=event_node_id,
        token=admin_token,
        ticket=NewTicket(name="Eintritt", product_id=TICKET_PRODUCT_ID, initial_top_up_amount=0),
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
            allowed_role_names=["admin", "finanzorga", "cashier"],
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=True,
            layout_id=layout.id,
        ),
    )
    tills = [NewTill(name=f"Eintrittskasse {i}", active_profile_id=profile.id) for i in range(n_tills)]
    for till in tills:
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
            allowed_role_names=["admin", "finanzorga", "cashier"],
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=False,
            layout_id=layout.id,
        ),
    )
    tills = [NewTill(name=f"Aufladekasse {i}", active_profile_id=profile.id) for i in range(n_tills)]
    for till in tills:
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

        self.db_pool = None

    async def _create_tills(self, conn: Connection, admin_token: str, n_tills: int):
        assert self.db_pool is not None
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        till_service = TillService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        product_service = ProductService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        ticket_service = TicketService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)

        logger.info(f"Creating {n_tills} tills")
        await _create_beverage_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            product_service=product_service,
            till_service=till_service,
            n_cocktail_tills=self.n_cocktail_tills,
            n_beer_tills=self.n_beer_tills,
        )
        await _create_topup_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            till_service=till_service,
            n_tills=self.n_topup_tills,
        )
        await _create_ticket_tills(
            conn=conn,
            admin_token=admin_token,
            event_node_id=self.event_node_id,
            ticket_service=ticket_service,
            till_service=till_service,
            n_tills=self.n_entry_tills,
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

    async def _create_cashiers(self, conn: Connection, user_service: UserService, n_cashiers: int):
        logger.info(f"Creating {n_cashiers} cashiers")
        for i in range(n_cashiers):
            cashier_tag_uid = await conn.fetchval(
                "insert into user_tag (node_id, uid) values ($1, $2) returning uid",
                self.event_node_id,
                i + CASHIER_TAG_START,
            )
            await user_service.create_user_no_auth(
                conn=conn,
                node_id=self.event_node_id,
                new_user=NewUser(
                    login=f"Cashier {i}",
                    display_name=f"Cashier {i}",
                    role_names=[CASHIER_ROLE_NAME],
                    user_tag_uid=cashier_tag_uid,
                ),
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

        async with self.db_pool.acquire() as conn:
            event_node = await create_event(
                conn=conn,
                node_id=ROOT_NODE_ID,
                event=NewEvent(
                    name="SSC-Test",
                    description="",
                    allowed_objects_at_node=ALL_OBJECT_TYPES,
                    allowed_objects_in_subtree=ALL_OBJECT_TYPES,
                    currency_identifier="EUR",
                    sumup_topup_enabled=True,
                    max_account_balance=150,
                    customer_portal_contact_email="test@test.com",
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
            self.event_node_id = event_node.id

            await _create_tags_and_users(
                conn=conn, user_service=user_service, event_node_id=self.event_node_id, n_customer_tags=self.n_tags
            )
            admin_login = await user_service.login_user(  # pylint: disable=missing-kwoa
                conn=conn, username="admin", password="admin"
            )
            assert admin_login is not None
            admin_token = admin_login.token
            await self._create_tills(conn=conn, admin_token=admin_token, n_tills=n_tills)
            await self._create_cashiers(conn=conn, user_service=user_service, n_cashiers=n_cashiers)
            await self._create_tse(conn=conn, admin_token=admin_token)
