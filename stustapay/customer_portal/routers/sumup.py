from fastapi import APIRouter, status

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.schema.customer import SumupCheckoutStatus
from stustapay.core.util import BaseModel

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


class CheckCheckoutPayload(BaseModel):
    checkout_id: str


class CheckCheckoutResponse(BaseModel):
    status: SumupCheckoutStatus
    checkout_id: str


@router.post("/create-checkout", summary="initiate customer checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    payload: CreateCheckoutPayload,
):
    checkout = await customer_service.sumup.create_checkout(token=token, amount=payload.amount)
    return CreateCheckoutResponse(checkout_id=checkout.id)
    # return CreateCheckoutResponse(checkout_id=str(uuid.uuid4()))


@router.post("/check-checkout", summary="after payment check checkout state", response_model=CheckCheckoutResponse)
async def check_checkout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    payload: CheckCheckoutPayload,
):
    checkout = await customer_service.sumup.check_checkout(token=token, checkout_id=payload.checkout_id)
    return CheckCheckoutResponse(status=checkout.status, checkout_id=checkout.id)
    # return CheckCheckoutResponse(status=SumupCheckoutStatus.FAILED, checkout_id=str(uuid.uuid4()))
