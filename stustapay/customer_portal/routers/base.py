"""
some basic api endpoints.
"""
from fastapi import APIRouter, status

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.schema.customer import Customer, CustomerBank, OrderWithBon
from stustapay.core.service.customer import PublicCustomerApiConfig

router = APIRouter(
    prefix="",
    tags=["base"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


@router.get("/customer", summary="Obtain customer", response_model=Customer)
async def get_customer(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    return await customer_service.get_customer(token=token)


@router.get("/orders_with_bon", summary="Obtain customer orders", response_model=list[OrderWithBon])
async def get_orders(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    return await customer_service.get_orders_with_bon(token=token)


@router.post("/customer_info", summary="set iban, account name and email", status_code=status.HTTP_204_NO_CONTENT)
async def update_customer_info(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    customer_bank: CustomerBank,
):
    await customer_service.update_customer_info(customer_bank=customer_bank, token=token)


@router.get("/public_customer_config", summary="get customer config", response_model=PublicCustomerApiConfig)
async def get_customer_config(
    customer_service: ContextCustomerService,
):
    return await customer_service.get_public_customer_api_config()
