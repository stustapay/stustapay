from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTaxRateService
from stustapay.core.http.normalize_data import NormalizedList, normalize_list
from stustapay.core.schema.tax_rate import TaxRate, TaxRateWithoutName

router = APIRouter(
    prefix="/tax-rates",
    tags=["tax-rates"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=NormalizedList[TaxRate, str])
async def list_tax_rates(token: CurrentAuthToken, tax_service: ContextTaxRateService):
    return normalize_list(await tax_service.list_tax_rates(token=token), primary_key="name")


@router.post("", response_model=TaxRate)
async def create_tax_rate(
    tax_rate: TaxRate,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
):
    return await tax_service.create_tax_rate(token=token, tax_rate=tax_rate)


@router.get("/{tax_rate_name}", response_model=TaxRate)
async def get_tax_rate(
    tax_rate_name: str,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
):
    tax_rate = await tax_service.get_tax_rate(token=token, tax_rate_name=tax_rate_name)
    if tax_rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return tax_rate


@router.post("/{tax_rate_name}", response_model=TaxRate)
async def update_tax_rate(
    tax_rate_name: str,
    tax_rate: TaxRateWithoutName,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
):
    tax_rate = await tax_service.update_tax_rate(token=token, tax_rate_name=tax_rate_name, tax_rate=tax_rate)
    if tax_rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return tax_rate


@router.delete("/{tax_rate_name}")
async def delete_tax_rate(
    tax_rate_name: str,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
):
    deleted = await tax_service.delete_tax_rate(token=token, tax_rate_name=tax_rate_name)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
