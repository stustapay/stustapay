from fastapi import APIRouter, Depends, status, HTTPException

from stustapay.core.http.context import get_tax_rate_service
from stustapay.core.schema.tax_rate import TaxRate, TaxRateWithoutName
from stustapay.core.service.tax_rates import TaxRateService

router = APIRouter(
    prefix="/tax-rates",
    tags=["tax-rates"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[TaxRate])
async def list_tax_rates(tax_service: TaxRateService = Depends(get_tax_rate_service)):
    return await tax_service.list_tax_rates()


@router.post("/", response_model=TaxRate)
async def create_tax_rate(tax_rate: TaxRate, tax_service: TaxRateService = Depends(get_tax_rate_service)):
    return await tax_service.create_tax_rate(tax_rate=tax_rate)


@router.get("/{tax_rate_name}", response_model=TaxRate)
async def get_tax_rate(tax_rate_name: str, tax_service: TaxRateService = Depends(get_tax_rate_service)):
    tax_rate = await tax_service.get_tax_rate(tax_rate_name=tax_rate_name)
    if tax_rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return tax_rate


@router.post("/{tax_rate_name}", response_model=TaxRate)
async def update_tax_rate(
        tax_rate_name: str, tax_rate: TaxRateWithoutName, tax_service: TaxRateService = Depends(get_tax_rate_service)
):
    tax_rate = await tax_service.update_tax_rate(tax_rate_name=tax_rate_name, tax_rate=tax_rate)
    if tax_rate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return tax_rate
