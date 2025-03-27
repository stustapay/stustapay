from fastapi import APIRouter, status
from pydantic import BaseModel

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextPresaleService
from stustapay.core.schema.customer import SumUpCheckoutStatus

router = APIRouter(
    prefix="/sumup",
    tags=["sumup"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


class CreateCheckoutPayload(BaseModel):
    amount: int
    ticket_id: int


class CreateCheckoutResponse(BaseModel):
    checkout_id: str


class CheckCheckoutPayload(BaseModel):
    checkout_id: str


class CheckCheckoutResponse(BaseModel):
    status: SumUpCheckoutStatus


@router.post("/create-checkout", summary="initiate presale checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    presale_service: ContextPresaleService,
    payload: CreateCheckoutPayload,
):
    checkout = await presale_service.sumup.create_checkout(payload)
    return CreateCheckoutResponse(checkout_id=checkout.id)


@router.post("/check-checkout", summary="after payment check checkout state", response_model=CheckCheckoutResponse)
async def check_checkout(
    payload: CheckCheckoutPayload,
    presale_service: ContextPresaleService,
):
    # TODO
    checkout_status = await presale_service.sumup.check_checkout(checkout_id=payload.checkout_id)
    return CheckCheckoutResponse(status=checkout_status)
