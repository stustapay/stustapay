from stustapay.core.schema.tax_type import TaxType

TAX_TYPE_TO_KASSENSICHV_INDEX: dict[TaxType, int] = {
    TaxType.regular_vat: 0,
    TaxType.reduced_vat: 1,
    TaxType.no_tax: 4,
    TaxType.transparent: 4,
}


def kassensichv_index_for_tax_type(tax_type: TaxType) -> int:
    try:
        return TAX_TYPE_TO_KASSENSICHV_INDEX[tax_type]
    except KeyError as exc:
        raise RuntimeError(f"unmapped tax type for KassenSichV: {tax_type!r}") from exc
