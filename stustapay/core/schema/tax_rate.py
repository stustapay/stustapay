from pydantic import BaseModel

TAX_NONE = "none"


class TaxRateWithoutName(BaseModel):
    rate: float
    description: str


class NewTaxRate(TaxRateWithoutName):
    name: str


class TaxRate(NewTaxRate):
    node_id: int
