from uuid import UUID

from fastapi import APIRouter, Request, status
from pydantic import BaseModel

from stustapay.core.http.auth_customer import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.schema.customer import (
    SharedTopupContribution,
    SharedTopupLink,
    SharedTopupPublicInfo,
    SumUpCheckoutStatus,
)
from stustapay.customer_portal.routers.common import get_customer_portal_base_url

router = APIRouter(
    prefix="/shared-topup",
    tags=["shared-topup"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "unauthorized"},
        status.HTTP_403_FORBIDDEN: {"description": "forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "not found"},
    },
)


class CreateSharedTopupLinkPayload(BaseModel):
    label: str | None = None


class CreateSharedTopupCheckoutPayload(BaseModel):
    amount: float
    contributor_name: str


class CreateSharedTopupCheckoutResponse(BaseModel):
    checkout_id: str
    order_uuid: UUID


class CheckSharedTopupCheckoutPayload(BaseModel):
    order_uuid: UUID


class CheckSharedTopupCheckoutResponse(BaseModel):
    status: SumUpCheckoutStatus


@router.get("/links", summary="list current customer's shared topup links", response_model=list[SharedTopupLink])
async def list_shared_topup_links(
    token: CurrentAuthToken,
    request: Request,
    customer_service: ContextCustomerService,
):
    return await customer_service.list_shared_topup_links(
        token=token,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )


@router.post("/links", summary="create a shared topup link", response_model=SharedTopupLink)
async def create_shared_topup_link(
    token: CurrentAuthToken,
    request: Request,
    customer_service: ContextCustomerService,
    payload: CreateSharedTopupLinkPayload,
):
    return await customer_service.create_shared_topup_link(
        token=token,
        label=payload.label,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )


@router.delete(
    "/links/{link_id}",
    summary="revoke a shared topup link",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_shared_topup_link(
    token: CurrentAuthToken,
    request: Request,
    customer_service: ContextCustomerService,
    link_id: int,
):
    await customer_service.revoke_shared_topup_link(
        token=token,
        link_id=link_id,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )


@router.get(
    "/contributions",
    summary="list current customer's shared topup contributions",
    response_model=list[SharedTopupContribution],
)
async def list_shared_topup_contributions(
    token: CurrentAuthToken,
    request: Request,
    customer_service: ContextCustomerService,
):
    return await customer_service.list_shared_topup_contributions(
        token=token,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )


@router.get("/{shared_topup_token}", summary="get public shared topup link info", response_model=SharedTopupPublicInfo)
async def get_shared_topup_public_info(
    request: Request,
    customer_service: ContextCustomerService,
    shared_topup_token: str,
):
    return await customer_service.get_shared_topup_public_info(
        token=shared_topup_token,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )


@router.post(
    "/{shared_topup_token}/create-checkout",
    summary="initiate shared topup checkout",
    response_model=CreateSharedTopupCheckoutResponse,
)
async def create_shared_topup_checkout(
    request: Request,
    customer_service: ContextCustomerService,
    shared_topup_token: str,
    payload: CreateSharedTopupCheckoutPayload,
):
    checkout, order_uuid = await customer_service.sumup.create_shared_topup_checkout(
        token=shared_topup_token,
        amount=payload.amount,
        contributor_name=payload.contributor_name,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )
    return CreateSharedTopupCheckoutResponse(checkout_id=checkout.id, order_uuid=order_uuid)


@router.post(
    "/{shared_topup_token}/check-checkout",
    summary="after shared topup payment check checkout state",
    response_model=CheckSharedTopupCheckoutResponse,
)
async def check_shared_topup_checkout(
    request: Request,
    customer_service: ContextCustomerService,
    shared_topup_token: str,
    payload: CheckSharedTopupCheckoutPayload,
):
    checkout_status = await customer_service.sumup.check_shared_topup_checkout(
        token=shared_topup_token,
        order_uuid=payload.order_uuid,
        customer_portal_base_url=get_customer_portal_base_url(request),
    )
    return CheckSharedTopupCheckoutResponse(status=checkout_status)
