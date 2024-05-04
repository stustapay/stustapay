from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.payout import (
    NewPayoutRun,
    Payout,
    PayoutRunWithStats,
    PendingPayoutDetail,
)

router = APIRouter(
    prefix="/payouts",
    tags=["payouts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=NormalizedList[PayoutRunWithStats, int])
async def list_payout_runs(token: CurrentAuthToken, customer_service: ContextCustomerService, node_id: int):
    return normalize_list(await customer_service.payout.list_payout_runs(token=token, node_id=node_id))


@router.post("/", response_model=PayoutRunWithStats)
async def create_payout_run(
    token: CurrentAuthToken,
    customer_service: ContextCustomerService,
    new_payout_run: NewPayoutRun,
    node_id: int,
):
    return await customer_service.payout.create_payout_run(token=token, new_payout_run=new_payout_run, node_id=node_id)


@router.get("/pending-payout-detail", response_model=PendingPayoutDetail)
async def pending_payout_detail(token: CurrentAuthToken, customer_service: ContextCustomerService, node_id: int):
    return await customer_service.payout.get_pending_payout_detail(token=token, node_id=node_id)


@router.get("/{payout_run_id}/payouts", response_model=list[Payout])
async def payout_run_payouts(
    token: CurrentAuthToken, payout_run_id: int, customer_service: ContextCustomerService, node_id: int
):
    return await customer_service.payout.get_payout_run_payouts(
        token=token, payout_run_id=payout_run_id, node_id=node_id
    )


@router.post("/{payout_run_id}/csv", response_model=str)
async def payout_run_csv_export(
    token: CurrentAuthToken,
    payout_run_id: int,
    customer_service: ContextCustomerService,
    node_id: int,
):
    return await customer_service.payout.get_payout_run_csv(token=token, payout_run_id=payout_run_id, node_id=node_id)


class CreateSepaXMLPayload(BaseModel):
    execution_date: date


@router.post("/{payout_run_id}/sepa_xml", response_model=str)
async def payout_run_sepa_xml(
    token: CurrentAuthToken,
    payout_run_id: int,
    customer_service: ContextCustomerService,
    payload: CreateSepaXMLPayload,
    node_id: int,
):
    return await customer_service.payout.get_payout_run_sepa_xml(
        token=token,
        node_id=node_id,
        payout_run_id=payout_run_id,
        execution_date=payload.execution_date,
    )


@router.post("/{payout_run_id}/previous_sepa_xml", response_model=str)
async def previous_payout_run_sepa_xml(
    token: CurrentAuthToken,
    payout_run_id: int,
    customer_service: ContextCustomerService,
    node_id: int,
):
    return await customer_service.payout.get_previous_payout_run_sepa_xml(
        token=token,
        node_id=node_id,
        payout_run_id=payout_run_id,
    )


@router.post("/{payout_run_id}/set-as-done")
async def set_payout_run_as_done(
    token: CurrentAuthToken,
    payout_run_id: int,
    customer_service: ContextCustomerService,
    node_id: int,
):
    return await customer_service.payout.set_payout_run_as_done(
        token=token,
        node_id=node_id,
        payout_run_id=payout_run_id,
    )


@router.post("/{payout_run_id}/revoke")
async def revoke_payout_run(
    token: CurrentAuthToken,
    payout_run_id: int,
    customer_service: ContextCustomerService,
    node_id: int,
):
    return await customer_service.payout.revoke_payout_run(
        token=token,
        node_id=node_id,
        payout_run_id=payout_run_id,
    )
