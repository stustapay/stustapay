# pylint: disable=unexpected-keyword-arg
from typing import Optional

import asyncpg
from pydantic import BaseModel
from stustapay.core.config import Config
from stustapay.core.schema.customer import Customer
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)


class CustomerLoginSuccess(BaseModel):
    customer: Customer
    token: str


class CustomerService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    async def login_customer(self, *, conn: asyncpg.Connection, uid: int, pin: str) -> Optional[CustomerLoginSuccess]:
        # Customer has hardware tag and pin
        row = await conn.fetchrow(
            "select a.* from user_tag u join account a on u.uid = a.user_tag_uid where u.uid = $1 and u.pin = $2",
            uid,
            pin,
        )
        if row is None:
            return None

        customer = Customer.parse_obj(row)

        session_id = await conn.fetchval(
            "insert into customer_session (customer) values ($1) returning id", customer.id
        )
        token = self.auth_service.create_customer_access_token(
            CustomerTokenMetadata(customer_id=customer.id, session_id=session_id)
        )
        return CustomerLoginSuccess(
            customer=customer,
            token=token,
        )

    @with_db_transaction
    @requires_customer
    async def logout_customer(self, *, conn: asyncpg.Connection, current_customer: Customer, token: str) -> bool:
        token_payload = self.auth_service.decode_customer_jwt_payload(token)
        if token_payload is None:
            return False

        if current_customer.id != token_payload.customer_id:
            return False

        result = await conn.execute(
            "delete from customer_session where customer = $1 and id = $2",
            current_customer.id,
            token_payload.session_id,
        )
        return result != "DELETE 0"
