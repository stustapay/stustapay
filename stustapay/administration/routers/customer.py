from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextAccountService, ContextCustomerService
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.user_tag import FindTagSwapCandidatesPayload, SwapCustomerTagPayload, SwapCustomerTagResponse
from stustapay.core.schema.user_tag_models import UserTagSwapCandidate

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
    node_id: int,
):
    return await account_service.find_customers(token=token, search_term=payload.search_term, node_id=node_id)


@router.post("/customers/tag-swap/find-tags", response_model=list[UserTagSwapCandidate])
async def find_customer_tag_swap_candidates(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    payload: FindTagSwapCandidatesPayload,
    node_id: int,
):
    return await account_service.find_customer_tag_swap_candidates(
        token=token,
        search_term=payload.search_term,
        mode=payload.mode,
        node_id=node_id,
    )


@router.post("/customers/tag-swap", response_model=SwapCustomerTagResponse)
async def swap_customer_tag(
    token: CurrentAuthToken,
    account_service: ContextAccountService,
    payload: SwapCustomerTagPayload,
    node_id: int,
):
    return await account_service.swap_customer_tag(
        token=token,
        node_id=node_id,
        source_user_tag_id=payload.source_user_tag_id,
        target_user_tag_id=payload.target_user_tag_id,
        comment=payload.comment,
        block_source_tag=payload.block_source_tag,
    )


@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(token: CurrentAuthToken, account_service: ContextAccountService, customer_id: int, node_id: int):
    return await account_service.get_customer(token=token, customer_id=customer_id, node_id=node_id)


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
