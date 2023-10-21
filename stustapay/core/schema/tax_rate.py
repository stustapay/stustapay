from pydantic import BaseModel

TAX_NONE = "none"


class NewTaxRate(BaseModel):
    name: str
    rate: float
    description: str


class TaxRate(NewTaxRate):
    id: int
    node_id: int
