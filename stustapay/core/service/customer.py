# pylint: disable=unexpected-keyword-arg
import csv
from typing import Optional, List

import asyncpg
from pydantic import BaseModel
from stustapay.core.config import Config
from stustapay.core.schema.account import Account
from stustapay.core.schema.customer import Customer, CustomerBank, OrderWithBon
from stustapay.core.schema.order import Order
from stustapay.core.service.auth import AuthService, CustomerTokenMetadata
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_customer,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from schwifty import IBAN


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
            "select c.* from user_tag u join customer c on u.uid = c.user_tag_uid where u.uid = $1 and u.pin = $2",
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


    @with_db_transaction
    @requires_customer
    async def get_customer(self, *, conn: asyncpg.Connection, current_customer: Customer) -> Optional[Customer]:
        return current_customer

        
    @with_db_transaction
    @requires_customer
    async def get_orders_with_bon(self, *, conn: asyncpg.Connection, current_customer: Customer) -> Optional[List[OrderWithBon]]:
        rows = await conn.fetch("select * from order_value_with_bon where customer_account_id = $1 order by booked_at DESC", current_customer.id)
        if rows is None:
            return None
        orders_with_bon: List[OrderWithBon] = [OrderWithBon.parse_obj(row) for row in rows]
        for order_with_bon in orders_with_bon:
            if order_with_bon.bon_output_file is not None:
                order_with_bon.bon_output_file = self.cfg.customer_portal.base_bon_url.format(bon_output_file=order_with_bon.bon_output_file)
        return orders_with_bon
            

    @with_db_transaction
    @requires_customer
    async def update_customer_info(self, *, conn: asyncpg.Connection, current_customer: Customer,
                                   customer_bank: CustomerBank) -> None:
        # check iban
        try:
            IBAN(customer_bank.iban)
        except ValueError:
            raise InvalidArgument("Provided IBAN is not valid")
        

        # if customer_info does not exist create it, otherwise update it
        result = await conn.execute(
            "insert into customer_info (customer_account_id, iban, account_name, email) values ($1, $2, $3, $4) on conflict (customer_account_id) do update set iban = $2, account_name = $3, email = $4",
            current_customer.id,
            customer_bank.iban,
            customer_bank.account_name,
            customer_bank.email
        )
        if result.rowcount == 0:
            raise InvalidArgument("Could not update customer account data")

    def data_privacy_url(self) -> str:
        return self.cfg.customer_portal.data_privacy_url
            
        