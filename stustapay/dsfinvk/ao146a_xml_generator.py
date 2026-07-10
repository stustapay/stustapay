import contextlib
import logging
import time
import xml.etree.ElementTree as ET
from datetime import date
from io import BytesIO

from sftkit.database import Connection

from stustapay import __version__ as stustapay_version
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.schema.tse import TseFormFactor, TseType, form_factor_for_tse_type
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.tree.common import (
    fetch_node,
)
from stustapay.tse.bsi_certification import bsi_certification_for_tse
from stustapay.tse.till_tse_lookup import get_tse_masterdata_for_till_at_z_nr

LOGGER = logging.getLogger(__name__)

TSE_FORM_FACTOR_TO_AO146A = {
    TseFormFactor.sd_card: "1",
    TseFormFactor.usb: "2",
    TseFormFactor.cloud: "3",
}


class AO146Aexporter:
    def __init__(self, config: Config, event_node_id: int, filename: str, shutdown_date: date | None = None):
        self.node_id = event_node_id
        self.config = config
        self.filename = filename
        self.shutdown_date = shutdown_date
        self.starttime = time.monotonic()

    async def run(self):
        async with contextlib.AsyncExitStack() as es:
            db = get_database(self.config.database)
            db_pool = await db.create_pool(n_connections=2)
            es.push_async_callback(db_pool.close)
            conn: Connection = await es.enter_async_context(db_pool.acquire())
            content = await self.generate(conn)
            with open(self.filename, "wb") as output_file:
                output_file.write(content)
            LOGGER.info(f"Duration: {time.monotonic() - self.starttime:.3f}s")

    async def generate(self, conn: Connection) -> bytes:
        node = await fetch_node(conn=conn, node_id=self.node_id)
        assert node is not None

        root_element = ET.Element(
            "Aufzeichnung146a",
            attrib={"xmlns": "http://finkonsens.de/elster/elsternachricht/aufzeichnung146a/v1", "version": "1"},
        )
        Aufzeichnung146a_1 = ET.SubElement(root_element, "Aufzeichnung146a")

        for row in await conn.fetch(
            "select distinct o.till_id "
            "from ordr o "
            "   join till t on o.till_id = t.id "
            "   join node n on t.node_id = n.id "
            "where n.id = $1 or $1 = any(n.parent_ids) "
            "order by o.till_id",
            node.id,
        ):
            tse_data = await get_tse_masterdata_for_till_at_z_nr(
                conn=conn,
                till_id=row["till_id"],
                z_nr=await conn.fetchval("select max(z_nr) from ordr where till_id = $1", row["till_id"]) or 0,
            )
            if tse_data is None:
                raise InvalidArgument(f"Kasse {row['till_id']} wurde bei keiner TSE registriert")

            first_booking_date = await conn.fetchval(
                "select booked_at from ordr where till_id=$1 order by booked_at limit 1", row["till_id"]
            )
            if tse_data["first_operation"] is not None:
                first_booking_date = tse_data["first_operation"]

            kasse_brand, kasse_modell, kasse_sw_brand = await conn.fetchrow(
                "select dsfinvk_brand, dsfinvk_model, dsfinvk_software_brand from till where id = $1",
                row["till_id"],
            )

            AngabenAufzeichnungssystem = ET.Element("AngabenAufzeichnungssystem")
            Art = ET.SubElement(AngabenAufzeichnungssystem, "Art")
            Art.text = "1"

            Software = ET.SubElement(AngabenAufzeichnungssystem, "Software")
            Software.text = str(kasse_sw_brand)

            SoftwareVersion = ET.SubElement(AngabenAufzeichnungssystem, "SoftwareVersion")
            SoftwareVersion.text = stustapay_version

            SeriennummerAS = ET.SubElement(AngabenAufzeichnungssystem, "SeriennummerAS")
            SeriennummerAS.text = str(row["till_id"])

            Hersteller = ET.SubElement(AngabenAufzeichnungssystem, "Hersteller")
            Hersteller.text = str(kasse_brand)

            Modell = ET.SubElement(AngabenAufzeichnungssystem, "Modell")
            Modell.text = str(kasse_modell)

            SeriennummerTSE = ET.SubElement(AngabenAufzeichnungssystem, "SeriennummerTSE")
            SeriennummerTSE.text = str(tse_data["serial"])

            InbetriebnahmeTSE = ET.SubElement(AngabenAufzeichnungssystem, "InbetriebnahmeTSE")
            InbetriebnahmeTSE.text = str(first_booking_date.strftime("%d.%m.%Y"))

            BSIID = ET.SubElement(AngabenAufzeichnungssystem, "BSIID")
            if not tse_data["tse_description"]:
                raise InvalidArgument(f"TSE {tse_data['id']} is missing TSE description for BSI certification lookup")
            try:
                bsi_certification_id, bsi_certification_year = bsi_certification_for_tse(
                    TseType(tse_data["type"]),
                    tse_data["tse_description"],
                )
            except RuntimeError as exc:
                raise InvalidArgument(
                    f"TSE {tse_data['id']} has unsupported BSI certification in description "
                    f"{tse_data['tse_description']!r}"
                ) from exc
            BSIID.text = f"{bsi_certification_id}-{bsi_certification_year}"

            BauformTSE = ET.SubElement(AngabenAufzeichnungssystem, "ArtTSE")
            BauformTSE.text = TSE_FORM_FACTOR_TO_AO146A[form_factor_for_tse_type(TseType(tse_data["type"]))]

            AnschaffungAS = ET.SubElement(AngabenAufzeichnungssystem, "AnschaffungAS")
            AnschaffungAS.text = str(first_booking_date.strftime("%d.%m.%Y"))

            InbetriebnahmeAS = ET.SubElement(AngabenAufzeichnungssystem, "InbetriebnahmeAS")
            InbetriebnahmeAS.text = str(first_booking_date.strftime("%d.%m.%Y"))

            if self.shutdown_date is not None:
                AusserbetriebnahmeAS = ET.SubElement(AngabenAufzeichnungssystem, "AusserbetriebnahmeAS")
                AusserbetriebnahmeAS.text = self.shutdown_date.strftime("%d.%m.%Y")
                GrundAusserbetriebnahme = ET.SubElement(AngabenAufzeichnungssystem, "GrundAusserbetriebnahme")
                GrundAusserbetriebnahme.text = str("Archivierung")

            Aufzeichnung146a_1.append(AngabenAufzeichnungssystem)

        return self._serialize_xml(Aufzeichnung146a_1)

    def _serialize_xml(self, aufzeichnung146a: ET.Element) -> bytes:
        xml_body = ET.tostring(aufzeichnung146a, encoding="utf-8")
        LOGGER.info(xml_body)
        buffer = BytesIO()
        buffer.write('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'.encode("utf-8"))
        buffer.write(
            '<Aufzeichnung146a xmlns="http://finkonsens.de/elster/elsternachricht/aufzeichnung146a/v1" version="1">\n'.encode(
                "utf-8"
            )
        )
        ET.ElementTree(aufzeichnung146a).write(buffer, method="xml", xml_declaration=False, encoding="UTF-8")
        buffer.write("</Aufzeichnung146a>\n".encode("utf-8"))
        return buffer.getvalue()
