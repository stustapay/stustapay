from dataclasses import dataclass


@dataclass
class TaxRateWithoutName:
    rate: float
    description: str


@dataclass
class TaxRate(TaxRateWithoutName):
    name: str
