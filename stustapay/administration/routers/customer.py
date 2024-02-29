from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService
from stustapay.core.schema.customer import Customer

router = APIRouter(
    prefix="",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)


class FindCustomerPayload(BaseModel):
    search_term: str


@router.post("/customers/find-customers", response_model=list[Customer])
async def find_customers(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    payload: FindCustomerPayload,
    node_id: Optional[int] = None,
):
    return await account_service.find_customers(token=token, search_term=payload.search_term, node_id=node_id)


@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(
    token: CurrentAuthToken, account_service: ContextAccountService, customer_id: int, node_id: Optional[int] = None
):
    return await account_service.get_customer(token=token, customer_id=customer_id, node_id=node_id)
