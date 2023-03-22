from pydantic import BaseModel

TAX_NONE = "none"


class TaxRateWithoutName(BaseModel):
    rate: float
    description: str


class TaxRate(TaxRateWithoutName):
    name: str
