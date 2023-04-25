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
)
from stustapay.core.schema.till import NewTill, Till, TillProfile
from stustapay.core.schema.user import Privilege, User, UserTag
from stustapay.core.service.auth import TerminalTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_terminal, requires_user_privileges, with_db_transaction
from stustapay.core.service.common.error import AccessDenied, NotFound
from stustapay.core.service.till.layout import TillLayoutService
from stustapay.core.service.till.profile import TillProfileService
from stustapay.core.service.user import AuthService


class TillService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.profile = TillProfileService(db_pool, config, auth_service)
        self.layout = TillLayoutService(db_pool, config, auth_service)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def create_till(self, *, conn: asyncpg.Connection, till: NewTill) -> Till:
        row = await conn.fetchrow(
            "insert into till (name, description, registration_uuid, tse_id, active_shift, active_profile_id, active_user_id) "
            "values ($1, $2, $3, $4, $5, $6, $7) returning id, name, description, registration_uuid, session_uuid, "
            "tse_id, active_shift, active_profile_id, active_user_id",
            till.name,
            till.description,
            uuid.uuid4(),
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
            till.active_user_id,
        )

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def list_tills(self, *, conn: asyncpg.Connection) -> list[Till]:
        cursor = conn.cursor("select * from till")
        result = []
        async for row in cursor:
            result.append(Till.parse_obj(row))
        return result

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def get_till(self, *, conn: asyncpg.Connection, till_id: str) -> Optional[Till]:
        row = await conn.fetchrow("select * from till where id = $1", till_id)
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
    async def update_till(self, *, conn: asyncpg.Connection, till_id: int, till: NewTill) -> Optional[Till]:
        row = await conn.fetchrow(
            "update till set name = $2, description = $3, tse_id = $4, active_shift = $5, active_profile_id = $6, active_user_id = $7 "
            "where id = $1 returning id, name, description, registration_uuid, tse_id, active_shift, active_profile_id, session_uuid, active_user_id",
            till_id,
            till.name,
            till.description,
            till.tse_id,
            till.active_shift,
            till.active_profile_id,
            till.active_user_id,
        )
        if row is None:
            return None

        return Till.parse_obj(row)

    @with_db_transaction
    @requires_user_privileges([Privilege.admin])
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
    @requires_user_privileges([Privilege.admin])
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
    async def login_user(self, *, conn: asyncpg.Connection, current_terminal: Terminal, user_tag: UserTag) -> User:
        """
        Login a User to the terminal, but only if the correct permissions exists:
        wants to login | allowed to log in
        official       | always
        cashier        | only if official is logged in

        where officials are admins and finanzorgas

        returns the newly logged-in User if successful
        """
        row = await conn.fetchrow(
            "select u.* from usr_with_privileges as u where u.user_tag_uid = $1",
            user_tag.uid,
        )
        if row is None:
            raise NotFound(element_typ="user_tag", element_id=str(user_tag.uid))
        new_user = User.parse_obj(row)

        row = await conn.fetchrow(
            "select * from usr_with_privileges where id = $1",
            current_terminal.till.active_user_id,
        )
        current_user = None if row is None else User.parse_obj(row)

        # check if login allowed
        officials = {Privilege.admin, Privilege.finanzorga}
        if officials & set(new_user.privileges):
            # Admin and Finanzorga can always log in
            pass
        elif Privilege.cashier in new_user.privileges:
            if not current_user or not {Privilege.admin, Privilege.finanzorga} & set(current_user.privileges):
                raise AccessDenied("You can only be logged in by an orga")
        else:
            raise AccessDenied("No cashier privilege")

        t_id = await conn.fetchval(
            "update till set active_user_id = $1 where id = $2 returning id", new_user.id, current_terminal.till.id
        )
        if t_id is None:
            # should not happen
            raise NotFound(element_typ="till", element_id=str(current_terminal.till.id))
        return new_user

    @with_db_transaction
    @requires_terminal()
    async def get_current_user(self, *, conn: asyncpg.Connection, current_terminal: Terminal) -> Optional[User]:
        row = await conn.fetchrow(
            "select * from usr_with_privileges where id = $1",
            current_terminal.till.active_user_id,
        )
        if row is None:
            return None
        return User.parse_obj(row)

    @with_db_transaction
    @requires_terminal()
    async def logout_user(self, *, conn: asyncpg.Connection, current_terminal: Terminal) -> bool:
        """
        Logout the currently logged-in user. This is always possible
        """

        t_id = await conn.fetchval(
            "update till set active_user_id = null where id = $1 returning id", current_terminal.till.id
        )
        return t_id is not None

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
            "select privileges from usr_with_privileges where id = $1", current_terminal.till.active_user_id
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
            "select * from till_profile join till on till_profile.id = till.active_profile_id where till.id = $1",
            current_terminal.till.id,
        )
        profile = TillProfile.parse_obj(db_profile)

        secrets = None
        # TODO: only send secrets if profile.allow_top_up:
        secrets = TerminalSecrets(sumup_affiliate_key=self.cfg.core.sumup_affiliate_key)

        return TerminalConfig(
            id=current_terminal.till.id,
            name=current_terminal.till.name,
            description=current_terminal.till.description,
            user_privileges=user_privileges,
            allow_top_up=profile.allow_top_up,
            allow_cash_out=profile.allow_cash_out,
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
