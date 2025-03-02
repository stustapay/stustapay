from uuid import UUID

from fastapi import APIRouter, status
from pydantic import BaseModel

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
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
    amount: float


class CreateCheckoutResponse(BaseModel):
    checkout_id: str
    order_uuid: UUID


class CheckCheckoutPayload(BaseModel):
    order_uuid: UUID


class CheckCheckoutResponse(BaseModel):
    status: SumUpCheckoutStatus


@router.post("/create-checkout", summary="initiate customer checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    payload: CreateCheckoutPayload,
):
    checkout, order_uuid = await customer_service.sumup.create_online_topup_checkout(token=token, amount=payload.amount)
    return CreateCheckoutResponse(checkout_id=checkout.id, order_uuid=order_uuid)


@router.post("/check-checkout", summary="after payment check checkout state", response_model=CheckCheckoutResponse)
async def check_checkout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    payload: CheckCheckoutPayload,
):
    checkout_status = await customer_service.sumup.check_online_topup_checkout(
        token=token, order_uuid=payload.order_uuid
    )
    return CheckCheckoutResponse(status=checkout_status)
