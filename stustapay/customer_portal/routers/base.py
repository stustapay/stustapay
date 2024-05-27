"""
some basic api endpoints.
"""

from fastapi import APIRouter, Response, status

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService, ContextMailService
from stustapay.core.schema.customer import (
    Customer,
    OrderWithBon,
    PayoutInfo,
    PayoutTransaction,
)
from stustapay.core.service.customer.customer import (
    CustomerBank,
    CustomerPortalApiConfig,
)

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
    mail_service: ContextMailService,
    customer_bank: CustomerBank,
):
    await customer_service.update_customer_info(customer_bank=customer_bank, token=token, mail_service=mail_service)


@router.post(
    "/customer_all_donation",
    summary="shortcut to declare that customer wants to donate all of the remaining balance",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_customer_info_donate_all(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    mail_service: ContextMailService,
):
    await customer_service.update_customer_info_donate_all(token=token, mail_service=mail_service)


@router.get("/payout_info", summary="info about current state of payout", response_model=PayoutInfo)
async def payout_info(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    return await customer_service.payout_info(token=token)


@router.get(
    "/get_payout_transactions",
    summary="transactions booked for payout if payout already happened",
    response_model=list[PayoutTransaction],
)
async def get_payout_transactions(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
):
    return await customer_service.get_payout_transactions(token=token)


@router.get("/config", summary="get customer customer portal config", response_model=CustomerPortalApiConfig)
async def get_customer_config(
    customer_service: ContextCustomerService,
    base_url: str,
):
    return await customer_service.get_api_config(base_url=base_url)


@router.get("/bon/{bon_id}", summary="Retrieve a bon")
async def get_bon(token: CurrentAuthToken, customer_service: ContextCustomerService, bon_id: int):
    mime_type, content = await customer_service.get_bon(
        token=token,
        bon_id=bon_id,
    )

    return Response(content=content, media_type=mime_type)
