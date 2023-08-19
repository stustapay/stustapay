from datetime import date
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextCustomerService
from stustapay.core.http.normalize_data import normalize_list, NormalizedList
from stustapay.core.schema.payout import PayoutRunWithStats, NewPayoutRun, PendingPayoutDetail, Payout

router = APIRouter(
    prefix="/payouts",
    tags=["payouts"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=NormalizedList[PayoutRunWithStats, int])
async def list_payout_runs(token: CurrentAuthToken, customer_service: ContextCustomerService):
    return normalize_list(await customer_service.payout.list_payout_runs(token=token))


@router.post("/", response_model=PayoutRunWithStats)
async def create_payout_run(
    token: CurrentAuthToken, customer_service: ContextCustomerService, new_payout_run: NewPayoutRun
):
    return await customer_service.payout.create_payout_run(token=token, new_payout_run=new_payout_run)


@router.get("/pending-payout-detail", response_model=PendingPayoutDetail)
async def pending_payout_detail(token: CurrentAuthToken, customer_service: ContextCustomerService):
    return await customer_service.payout.get_pending_payout_detail(token=token)


@router.get("/{payout_run_id}/csv", response_model=list[Payout])
async def payout_run_payouts(token: CurrentAuthToken, payout_run_id: int, customer_service: ContextCustomerService):
    return list(await customer_service.payout.get_payout_run_payouts(token=token, payout_run_id=payout_run_id))


class CreateCSVPayload(BaseModel):
    batch_size: Optional[int] = None


@router.post("/{payout_run_id}/csv", response_model=list[str])
async def payout_run_csv_export(
    token: CurrentAuthToken, payout_run_id: int, customer_service: ContextCustomerService, payload: CreateCSVPayload
):
    return list(
        await customer_service.payout.get_payout_run_csv(
            token=token, payout_run_id=payout_run_id, batch_size=payload.batch_size
        )
    )


class CreateSepaXMLPayload(BaseModel):
    execution_date: date
    batch_size: Optional[int] = None


@router.post("/{payout_run_id}/sepa_xml", response_model=list[str])
async def payout_run_sepa_xml_export(
    token: CurrentAuthToken, payout_run_id: int, customer_service: ContextCustomerService, payload: CreateSepaXMLPayload
):
    return list(
        await customer_service.payout.get_payout_run_sepa_xml(
            token=token,
            payout_run_id=payout_run_id,
            batch_size=payload.batch_size,
            execution_date=payload.execution_date,
        )
    )
