from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService, ContextCustomerService
from stustapay.core.schema.customer import Customer

router = APIRouter(
    prefix="",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)


class FindCustomerPayload(BaseModel):
    search_term: str


class SwitchCustomerTagPayload(BaseModel):
    old_user_tag_pin: str
    new_user_tag_pin: str
    comment: str


@router.post("/customers/find-customers", response_model=list[Customer])
async def find_customers(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    payload: FindCustomerPayload,
    node_id: int,
):
    return await account_service.find_customers(token=token, search_term=payload.search_term, node_id=node_id)


@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(token: CurrentAuthToken, account_service: ContextAccountService, customer_id: int, node_id: int):
    return await account_service.get_customer(token=token, customer_id=customer_id, node_id=node_id)


@router.get("/customers-with-blocked-payout", response_model=list[Customer])
async def get_customers_with_blocked_payout(
    token: CurrentAuthToken, account_service: ContextAccountService, node_id: int
):
    return await account_service.get_customers_with_blocked_payout(token=token, node_id=node_id)


@router.post("/customers/{customer_id}/prevent-payout")
async def prevent_customer_payout(
    token: CurrentAuthToken, customer_service: ContextCustomerService, customer_id: int, node_id: int
):
    return await customer_service.payout.prevent_customer_payout(token=token, customer_id=customer_id, node_id=node_id)


@router.post("/customers/{customer_id}/allow-payout")
async def allow_customer_payout(
    token: CurrentAuthToken, customer_service: ContextCustomerService, customer_id: int, node_id: int
):
    return await customer_service.payout.allow_customer_payout(token=token, customer_id=customer_id, node_id=node_id)


@router.post("/customers/switch-tag")
async def switch_customer_tag(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    payload: SwitchCustomerTagPayload,
    node_id: int,
):
    await account_service.switch_customer_tag(
        token=token,
        node_id=node_id,
        old_user_tag_pin=payload.old_user_tag_pin,
        new_user_tag_pin=payload.new_user_tag_pin,
        comment=payload.comment,
    )
