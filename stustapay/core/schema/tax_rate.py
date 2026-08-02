from pydantic import BaseModel

from stustapay.core.schema.tax_type import TaxType

TAX_NONE = "none"


class NewTaxRate(BaseModel):
    name: str
    rate: float
    description: str
    tax_type: TaxType


class TaxRate(NewTaxRate):
    id: int
    node_id: int
