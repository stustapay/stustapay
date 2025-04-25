from fastapi import APIRouter, status
from pydantic import BaseModel

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.schema.customer import Customer

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


class LoginPayload(BaseModel):
    pin: str
    node_id: int


class LoginResponse(BaseModel):
    customer: Customer
    access_token: str
    grant_type: str = "bearer"


@router.post("/login", summary="customer login with wristband hardware tag and pin", response_model=LoginResponse)
async def login(
    payload: LoginPayload,
    customer_service: ContextCustomerService,
):
    response = await customer_service.login_customer(pin=payload.pin, node_id=payload.node_id)
    return {"customer": response.customer, "access_token": response.token, "grant_type": "bearer"}


@router.post(
    "/logout",
    summary="sign out of the current session",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    await customer_service.logout_customer(token=token)
