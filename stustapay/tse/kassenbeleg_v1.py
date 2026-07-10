import re

from stustapay.core.schema.tax_type import TaxType
from stustapay.tse.tax_type import kassensichv_index_for_tax_type


class Kassenbeleg_V1:
    ZAHLUNGSARTEN = {"Bar", "Unbar"}

    # TODO the separators are still wrong
    SEPARATORS = "^_:"

    def __init__(self, bon_typ: str = "Beleg"):
        self.bon_typ = bon_typ
        self.brutto_steuerumsaetze = [0, 0, 0, 0, 0]
        self.zahlungen: list[str] = []

    def add_line_item(self, price, tax_type: TaxType):
        tax_rate_index = kassensichv_index_for_tax_type(tax_type)
        self.brutto_steuerumsaetze[tax_rate_index] += price

    def add_zahlung(self, betrag: float, zahlungsart: str, waehrung="EUR"):
        zahlungsart = zahlungsart.capitalize()
        if zahlungsart not in self.ZAHLUNGSARTEN:
            raise RuntimeError(f"{zahlungsart=!r} must be one of {self.ZAHLUNGSARTEN}")
        parts = [f"{betrag:.2f}", zahlungsart]
        if waehrung != "EUR":
            if not re.match(r"[A-Z]{3}", waehrung):
                raise RuntimeError(f"'waehrung' does not follow ISO 4217: {waehrung!r}")
            parts.append(waehrung)
        self.zahlungen.append(self.SEPARATORS[2].join(parts))

    @staticmethod
    def get_process_type() -> str:
        return "Kassenbeleg-V1"

    def get_process_data(self) -> str:
        brutto_steuerumsaetze_joined = self.SEPARATORS[1].join(
            f"{brutto_steuerumsatz:.2f}" for brutto_steuerumsatz in self.brutto_steuerumsaetze
        )
        return (
            f"{self.bon_typ}{self.SEPARATORS[0]}"
            f"{brutto_steuerumsaetze_joined}{self.SEPARATORS[0]}"
            f"{self.SEPARATORS[1].join(self.zahlungen)}"
        )
