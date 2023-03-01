from pydantic import BaseModel


class TaxRateWithoutName(BaseModel):
    rate: float
    description: str


class TaxRate(TaxRateWithoutName):
    name: str
