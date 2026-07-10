BSI_CERTIFICATION_ID_TO_YEAR: dict[str, str] = {
    "0362": "2019",
    "0393": "2020",
    "0415": "2021",
}


def bsi_certification_id_from_tse_description(tse_description: str) -> str:
    if len(tse_description) < 4:
        raise RuntimeError(f"TSE description too short for BSI certification id: {tse_description!r}")
    return tse_description[-4:]


def bsi_certification_year_for_id(bsi_certification_id: str) -> str:
    try:
        return BSI_CERTIFICATION_ID_TO_YEAR[bsi_certification_id]
    except KeyError as exc:
        raise RuntimeError(f"unmapped BSI certification id for year lookup: {bsi_certification_id!r}") from exc


def bsi_certification_for_tse_description(tse_description: str) -> tuple[str, str]:
    bsi_certification_id = bsi_certification_id_from_tse_description(tse_description)
    return bsi_certification_id, bsi_certification_year_for_id(bsi_certification_id)
