from stustapay.core.schema.tse import TseType
from stustapay.tse.bsi_certification import bsi_certification_for_tse
from stustapay.tse.diebold_nixdorf_usb.bsi_certification import bsi_certification_for_tse_description


def test_diebold_nixdorf_bsi_certification_for_tse_description() -> None:
    assert bsi_certification_for_tse_description("Diebold Nixdorf USB TSE 0362") == ("0362", "2019")


def test_bsi_certification_for_tse_dispatches_by_type() -> None:
    assert bsi_certification_for_tse(TseType.diebold_nixdorf, "Diebold Nixdorf USB TSE 0415") == ("0415", "2021")
