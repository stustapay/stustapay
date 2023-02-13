from dataclasses import dataclass


@dataclass
class TaxRateWithoutName:
    rate: float
    description: str


@dataclass
class TaxRate(TaxRateWithoutName):
    name: str

    @classmethod
    def from_db(cls, row) -> "TaxRate":
        return cls(
            name=row["name"],
            rate=row["rate"],
            description=row["description"],
        )
