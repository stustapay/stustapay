from fastapi import APIRouter, HTTPException, Response, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTaxRateService
from stustapay.core.schema.tax_rate import NewTaxRate, TaxRate

router = APIRouter(
    prefix="/tax_rates",
    tags=["tax_rates"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[TaxRate])
async def list_tax_rates(token: CurrentAuthToken, response: Response, tax_service: ContextTaxRateService, node_id: int):
    resp = await tax_service.list_tax_rates(token=token, node_id=node_id)
    response.headers["Content-Range"] = str(len(resp))
    return resp


@router.post("", response_model=TaxRate)
async def create_tax_rate(
    tax_rate: NewTaxRate, token: CurrentAuthToken, tax_service: ContextTaxRateService, node_id: int
):
    return await tax_service.create_tax_rate(token=token, tax_rate=tax_rate, node_id=node_id)


@router.get("/{tax_rate_id}", response_model=TaxRate)
async def get_tax_rate(tax_rate_id: int, token: CurrentAuthToken, tax_service: ContextTaxRateService, node_id: int):
    tax_rate = await tax_service.get_tax_rate(token=token, tax_rate_id=tax_rate_id, node_id=node_id)
    if tax_rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return tax_rate


@router.put("/{tax_rate_id}", response_model=TaxRate)
async def update_tax_rate(
    tax_rate_id: int,
    tax_rate: NewTaxRate,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
    node_id: int,
):
    return await tax_service.update_tax_rate(token=token, tax_rate_id=tax_rate_id, tax_rate=tax_rate, node_id=node_id)


@router.delete("/{tax_rate_id}")
async def delete_tax_rate(tax_rate_id: int, token: CurrentAuthToken, tax_service: ContextTaxRateService, node_id: int):
    deleted = await tax_service.delete_tax_rate(token=token, tax_rate_id=tax_rate_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
