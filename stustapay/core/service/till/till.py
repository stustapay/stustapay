import uuid
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.terminal import (
    Terminal,
    TerminalConfig,
    TerminalRegistrationSuccess,
    TerminalSecrets,
    TerminalButton,
    ENTRY_BUTTON_ID,
    ENTRY_U18_BUTTON_ID,
    ENTRY_U16_BUTTON_ID,
)
from stustapay.core.schema.till import NewTill, Till, TillProfile
from stustapay.core.schema.user import Privilege, UserTag, UserRole, CurrentUser
from stustapay.core.service.auth import TerminalTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_terminal, requires_user, with_db_transaction
from stustapay.core.service.common.error import AccessDenied, NotFound
from stustapay.core.service.product import ProductService
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.till.register import TillRegisterService
from stustapay.core.service.user import AuthService


class TillService(DBService):
    def __init__(
        self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, product_service: ProductService
    ):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.product_service = product_service

        self.profile = TillProfileService(db_pool, config, auth_service)
        self.layout = TillLayoutService(db_pool, config, auth_service)
        self.register = TillRegisterService(db_pool, config, auth_service)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def create_till(self, *, conn: asyncpg.Connection, till: NewTill) -> Till:
        row = await conn.fetchrow(
            "insert into till "
            "   (name, description, registration_uuid, tse_id, active_shift, active_profile_id) "
            "values ($1, $2, $3, $4, $5, $6) returning id, name, description, registration_uuid, session_uuid, "
            "   tse_id, active_shift, active_profile_id",
            till.name,
            till.description,
            uuid.uuid4(),
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
        )

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def list_tills(self, *, conn: asyncpg.Connection) -> list[Till]:
        cursor = conn.cursor("select * from till")
        result = []
        async for row in cursor:
            result.append(Till.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def get_till(self, *, conn: asyncpg.Connection, till_id: str) -> Optional[Till]:
        row = await conn.fetchrow("select * from till where id = $1", till_id)
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def update_till(self, *, conn: asyncpg.Connection, till_id: int, till: NewTill) -> Optional[Till]:
        row = await conn.fetchrow(
            "update till set name = $2, description = $3, tse_id = $4, active_shift = $5, active_profile_id = $6 "
            "where id = $1 returning id, name, description, registration_uuid, tse_id, active_shift, "
            "   active_profile_id, session_uuid",
            till_id,
            till.name,
            till.description,
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
        )
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def delete_till(self, *, conn: asyncpg.Connection, till_id: int) -> bool:
        result = await conn.execute(
            "delete from till where id = $1",
            till_id,
        )
        return result != "DELETE 0"

    @with_db_transaction
    async def register_terminal(
        self, *, conn: asyncpg.Connection, registration_uuid: str
    ) -> Optional[TerminalRegistrationSuccess]:
        row = await conn.fetchrow("select * from till where registration_uuid = $1", registration_uuid)
        if row is None:
            return None
        till = Till.parse_obj(row)
        session_uuid = await conn.fetchval(
            "update till set session_uuid = gen_random_uuid(), registration_uuid = null where id = $1 "
            "returning session_uuid",
            till.id,
        )
        token = self.auth_service.create_terminal_access_token(
            TerminalTokenMetadata(till_id=till.id, session_uuid=session_uuid)
        )
        return TerminalRegistrationSuccess(till=till, token=token)

    @with_db_transaction
    @requires_user([Privilege.till_management])
    async def logout_terminal_id(self, *, conn: asyncpg.Connection, till_id: int) -> bool:
        id_ = await conn.fetchval(
            "update till set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1 returning id",
            till_id,
        )
        if id_ is None:
            raise NotFound(element_typ="till", element_id=str(till_id))
        return True

    @with_db_transaction
    @requires_terminal()
    async def logout_terminal(self, *, conn: asyncpg.Connection, current_terminal: Terminal) -> bool:
        id_ = await conn.fetchval(
            "update till set registration_uuid = gen_random_uuid(), session_uuid = null where id = $1 returning id",
            current_terminal.till.id,
        )
        return id_ is not None

    @with_db_transaction
    @requires_terminal()
    async def check_user_login(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal, user_tag: UserTag
    ) -> list[UserRole]:
        """
        Check if a user can log in to the terminal and return the available roles he can log in as
        """

        # we fetch all roles that contain either the terminal login or supervised terminal login privilege
        rows = await conn.fetch(
            "select urwp.* "
            "from user_role_with_privileges urwp "
            "join user_to_role urt on urwp.id = urt.role_id "
            "join usr on urt.user_id = usr.id "
            "join allowed_user_roles_for_till_profile aurftp on urt.role_id = aurftp.role_id "
            "where usr.user_tag_uid = $1 "
            "   and ($2 = any(urwp.privileges) or $3 = any(urwp.privileges)) "
            "   and aurftp.profile_id = $4",
            user_tag.uid,
            Privilege.terminal_login.name,
            Privilege.supervised_terminal_login.name,
            current_terminal.till.active_profile_id,
        )
        if rows is None or len(rows) == 0:
            raise AccessDenied(
                "User is not known or does not have any assigned roles or the user does not "
                "have permission to login at a terminal"
            )
        available_roles = [UserRole.parse_obj(x) for x in rows]

        new_user_is_supervisor = await conn.fetchval(
            "select true from user_with_privileges where user_tag_uid = $1 and $2 = any(privileges)",
            user_tag.uid,
            Privilege.terminal_login.name,
        )
        if new_user_is_supervisor:
            pass
        else:
            current_user_is_supervisor = await conn.fetchval(
                "select true from user_with_privileges uwp where id = $1 and $2 = any(uwp.privileges)",
                current_terminal.till.active_user_id,
                Privilege.terminal_login.name,
            )
            if not current_user_is_supervisor:
                raise AccessDenied("You can only be logged in by a supervisor")

        return available_roles

    @with_db_transaction
    @requires_terminal()
    async def login_user(
        self, *, conn: asyncpg.Connection, token: str, current_terminal: Terminal, user_tag: UserTag, user_role_id: int
    ) -> CurrentUser:
        """
        Login a User to the terminal, but only if the correct permissions exists:
        wants to login | allowed to log in
        official       | always
        cashier        | only if official is logged in

        where officials are admins and finanzorgas

        returns the newly logged-in User if successful
        """
        available_roles = await self.check_user_login(  # pylint: disable=missing-kwoa
            conn=conn, current_terminal=current_terminal, user_tag=user_tag
        )
        if not any(x.id == user_role_id for x in available_roles):
            raise AccessDenied("The user does not have the requested role")

        user_id = await conn.fetchval("select usr.id from usr where user_tag_uid = $1", user_tag.uid)
        assert user_id is not None

        is_role_allowed = await conn.fetchval(
            "select true from allowed_user_roles_for_till_profile where role_id = $1 and profile_id = $2",
            user_role_id,
            current_terminal.till.active_profile_id,
        )
        if not is_role_allowed:
            raise AccessDenied("This till does not allow login with this role")

        t_id = await conn.fetchval(
            "update till set active_user_id = $1, active_user_role_id = $2 where id = $3 returning id",
            user_id,
            user_role_id,
            current_terminal.till.id,
        )
        assert t_id is not None
        # instead of manually redoing the necessary queries we simply reuse the normal auth decorator
        return await self.get_current_user(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn, token=token
        )

    @with_db_transaction
    @requires_terminal()
    async def get_current_user(self, *, current_user: Optional[CurrentUser]) -> Optional[CurrentUser]:
        return current_user

    @with_db_transaction
    @requires_terminal()
    async def logout_user(self, *, conn: asyncpg.Connection, current_terminal: Terminal) -> bool:
        """
        Logout the currently logged-in user. This is always possible
        """

        t_id = await conn.fetchval(
            "update till set active_user_id = null, active_user_role_id = null where id = $1 returning id",
            current_terminal.till.id,
        )
        return t_id is not None

    async def _construct_ticket_buttons(self, *, conn: asyncpg.Connection) -> list[TerminalButton]:
        initial_topup_amount = await self.product_service.fetch_initial_topup_amount(conn=conn)
        ticket_product = await self.product_service.fetch_ticket_product(conn=conn)
        assert ticket_product.price is not None
        ticket_u16_product = await self.product_service.fetch_ticket_product_u16(conn=conn)
        assert ticket_u16_product.price is not None
        ticket_u18_product = await self.product_service.fetch_ticket_product_u18(conn=conn)
        assert ticket_u18_product.price is not None
        return [
            TerminalButton(
                id=ENTRY_BUTTON_ID,
                name=ticket_product.name,
                price=ticket_product.price + initial_topup_amount,
                is_returnable=False,
                fixed_price=True,
            ),
            TerminalButton(
                id=ENTRY_U16_BUTTON_ID,
                name=ticket_u16_product.name,
                price=ticket_u16_product.price + initial_topup_amount,
                is_returnable=False,
                fixed_price=True,
            ),
            TerminalButton(
                id=ENTRY_U18_BUTTON_ID,
                name=ticket_u18_product.name,
                price=ticket_u18_product.price + initial_topup_amount,
                is_returnable=False,
                fixed_price=True,
            ),
        ]

    @with_db_transaction
    @requires_terminal()
    async def get_terminal_config(
        self, *, conn: asyncpg.Connection, current_terminal: Terminal
    ) -> Optional[TerminalConfig]:
        db_profile = await conn.fetchrow(
            "select * from till_profile tp where id = $1", current_terminal.till.active_profile_id
        )
        if db_profile is None:
            return None
        user_privileges = await conn.fetchval(
            "select privileges from user_with_privileges where id = $1", current_terminal.till.active_user_id
        )
        db_buttons = conn.cursor(
            "select tlwb.* "
            "from till_button_with_products tlwb "
            "join till_layout_to_button tltb on tltb.button_id = tlwb.id "
            "where tltb.layout_id = $1 "
            "order by tltb.sequence_number asc",
            db_profile["layout_id"],
        )
        buttons = []
        async for db_button in db_buttons:
            buttons.append(TerminalButton.parse_obj(db_button))
        db_profile = await conn.fetchrow(
            "select * from till_profile_with_allowed_roles tp join till on tp.id = till.active_profile_id "
            "where till.id = $1",
            current_terminal.till.id,
        )
        profile = TillProfile.parse_obj(db_profile)

        secrets = None
        # TODO: only send secrets if profile.allow_top_up:
        secrets = TerminalSecrets(sumup_affiliate_key=self.cfg.core.sumup_affiliate_key)
        ticket_buttons = await self._construct_ticket_buttons(conn=conn)

        return TerminalConfig(
            id=current_terminal.till.id,
            name=current_terminal.till.name,
            description=current_terminal.till.description,
            user_privileges=user_privileges,
            allow_top_up=profile.allow_top_up,
            allow_cash_out=profile.allow_cash_out,
            allow_ticket_sale=profile.allow_ticket_sale,
            ticket_buttons=ticket_buttons,
            buttons=buttons,
            secrets=secrets,
        )

    @with_db_transaction
    @requires_terminal()
    async def get_customer(self, *, conn: asyncpg.Connection, customer_tag_uid: int) -> Optional[Customer]:
        customer = await conn.fetchrow("select * from account a where a.user_tag_uid = $1", customer_tag_uid)
        if customer is None:
            return None
        return Customer.parse_obj(customer)
