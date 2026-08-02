import enum


class TaxType(enum.Enum):
    regular_vat = "regular_vat"
    reduced_vat = "reduced_vat"
    no_tax = "no_tax"
    transparent = "transparent"
