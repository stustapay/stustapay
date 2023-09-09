# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import logging

from stustapay.core.config import Config
from stustapay.core.database import rebuild_with
from stustapay.core.schema.till import NewCashRegister, NewCashRegisterStocking, NewTill
from stustapay.core.schema.user import CASHIER_ROLE_NAME, UserWithoutId
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import with_db_transaction
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.framework.database import Connection, create_db_pool

DB_INIT_FILE = "simulator_data.sql"

PROFILE_ID_BEER = 0
PROFILE_ID_COCKTAIL = 1
PROFILE_ID_TOPUP = 2
PROFILE_ID_TICKET = 3

CASHIER_TAG_START = 1000
CUSTOMER_TAG_START = 100000


class DatabaseSetup:
    def __init__(
        self,
        config: Config,
        n_cashiers: int,
        n_tags: int,
        n_entry_tills: int,
        n_topup_tills: int,
        n_beer_tills: int,
        n_cocktail_tills: int,
    ):
        self.config = config
        self.n_cashiers = n_cashiers
        self.n_tags = n_tags
        self.n_entry_tills = n_entry_tills
        self.n_topup_tills = n_topup_tills
        self.n_beer_tills = n_beer_tills
        self.n_cocktail_tills = n_cocktail_tills

        self.logger = logging.getLogger(__name__)
        self.db_pool = None

    @with_db_transaction
    async def _create_tags(self, conn: Connection):
        self.logger.info(f"Creating {self.n_tags} tags")
        for i in range(self.n_tags):
            await conn.execute("insert into user_tag (uid, pin) values ($1, $2)", i + CUSTOMER_TAG_START, "pin")

    async def _create_tills(self, admin_token: str, till_service: TillService, n_tills: int):
        self.logger.info(f"Creating {n_tills} tills")
        for i in range(self.n_topup_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Aufladekasse {i}", active_profile_id=PROFILE_ID_TOPUP),
            )
        for i in range(self.n_entry_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Eintrittskasse {i}", active_profile_id=PROFILE_ID_TICKET),
            )
        for i in range(self.n_beer_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Bierkasse {i}", active_profile_id=PROFILE_ID_BEER),
            )
        for i in range(self.n_cocktail_tills):
            await till_service.create_till(
                token=admin_token,
                till=NewTill(name=f"Cocktailkasse {i}", active_profile_id=PROFILE_ID_COCKTAIL),
            )
        for i in range(n_tills):
            await till_service.register.create_cash_register(
                token=admin_token, new_register=NewCashRegister(name=f"Blechkasse {i}")
            )

        await till_service.register.create_cash_register_stockings(
            token=admin_token, stocking=NewCashRegisterStocking(name="Stocking", euro20=2, euro10=1)
        )

    async def _create_cashiers(self, user_service: UserService, n_cashiers: int):
        assert self.db_pool is not None

        self.logger.info(f"Creating {n_cashiers} cashiers")
        for i in range(n_cashiers):
            cashier_tag_uid = await self.db_pool.fetchval(
                "insert into user_tag (uid) values ($1) returning uid", i + CASHIER_TAG_START
            )
            await user_service.create_user_no_auth(
                new_user=UserWithoutId(
                    login=f"Cashier {i}",
                    display_name=f"Cashier {i}",
                    role_names=[CASHIER_ROLE_NAME],
                    user_tag_uid=cashier_tag_uid,
                )
            )

    async def run(self):
        self.db_pool = await create_db_pool(self.config.database)
        await rebuild_with(self.db_pool, DB_INIT_FILE)
        n_tills = self.n_entry_tills + self.n_topup_tills + self.n_beer_tills + self.n_cocktail_tills
        n_cashiers = max(int(n_tills * 1.5), self.n_cashiers or 0)

        await self._create_tags()  # pylint: disable=no-value-for-parameter
        auth_service = AuthService(db_pool=self.db_pool, config=self.config)
        till_service = TillService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        user_service = UserService(db_pool=self.db_pool, config=self.config, auth_service=auth_service)
        admin_login = await user_service.login_user(username="admin", password="admin")  # pylint: disable=missing-kwoa
        assert admin_login is not None
        admin_token = admin_login.token
        await self._create_tills(admin_token=admin_token, till_service=till_service, n_tills=n_tills)
        await self._create_cashiers(user_service=user_service, n_cashiers=n_cashiers)
