import uuid

from fastapi import APIRouter, status

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
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
    checkout_reference: uuid.UUID


@router.post("/create-checkout", summary="initiate customer checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    payload: CreateCheckoutPayload,
):
    checkout = await customer_service.sumup.create_checkout(token=token, amount=payload.amount)
    return CreateCheckoutResponse(checkout_reference=checkout.checkout_reference)
