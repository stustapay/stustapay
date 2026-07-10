from stustapay.core.schema.tse import TseType
from stustapay.tse.diebold_nixdorf_usb.bsi_certification import (
    bsi_certification_for_tse_description as diebold_nixdorf_bsi_certification_for_tse_description,
)


def bsi_certification_for_tse(tse_type: TseType, tse_description: str) -> tuple[str, str]:
    if tse_type == TseType.diebold_nixdorf:
        return diebold_nixdorf_bsi_certification_for_tse_description(tse_description)
    raise RuntimeError(f"unmapped TSE type for BSI certification: {tse_type!r}")
