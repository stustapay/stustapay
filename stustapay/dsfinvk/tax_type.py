from stustapay.core.schema.tax_type import TaxType

TAX_TYPE_TO_DSFINVK_SCHLUESSEL: dict[TaxType, int] = {
    TaxType.regular_vat: 1,
    TaxType.reduced_vat: 2,
    TaxType.no_tax: 5,
    TaxType.transparent: 1337,
}


def dsfinvk_schluessel_for_tax_type(tax_type: TaxType) -> int:
    try:
        return TAX_TYPE_TO_DSFINVK_SCHLUESSEL[tax_type]
    except KeyError as exc:
        raise RuntimeError(f"unmapped tax type for DSFinV-K: {tax_type!r}") from exc
