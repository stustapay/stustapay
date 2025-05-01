import contextlib
import logging
import time
from datetime import datetime
import xml.etree.ElementTree as ET
from decimal import Decimal

from dateutil import parser
from sftkit.database import Connection

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)

from ..core.database import get_database

LOGGER = logging.getLogger(__name__)


class AO146Aexporter:
    def __init__(self, config: Config, event_node_id: int, filename: str, xml: str, dtd: str, simulate: bool):
        self.node_id = event_node_id
        self.config = config
        self.filename = filename
        self.xml = xml  # path to index.xml file
        self.dtd = dtd  # path to *.dtd file
        self.simulate = simulate
        self.starttime = time.monotonic()
        self.PLZ = ""
        self.Street = ""
        self.City = ""

    async def run(self):
        async with contextlib.AsyncExitStack() as es:
            db = get_database(self.config.database)
            db_pool = await db.create_pool(n_connections=2)
            es.push_async_callback(db_pool.close)
            conn: Connection = await es.enter_async_context(db_pool.acquire())
            node = await fetch_node(conn=conn, node_id=self.node_id)
            assert node is not None
            event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=self.node_id)

            # extract address information
            bon_addr = event_settings.bon_address
            if "\n" in bon_addr:
                self.Street = bon_addr.split("\n")[0]
                self.PLZ = bon_addr.split("\n")[1].split(" ")[0]
                self.City = bon_addr.split("\n")[1].split(" ")[1]
            else:
                self.Street = bon_addr.split(" ")[0] + " " + bon_addr.split(" ")[1]
                self.PLZ = bon_addr.split(" ")[2]
                self.City = bon_addr.split(" ")[3]

            Aufzeichnung146a_1 = ET.Element("Aufzeichnung146a")

            # iteriere über alle Kassen
            # alle Kassen mit einer order (und damit auch mit einer TSE und die deshalb ans Finanzamt gemeldet wurden)
            for row in await conn.fetch(
                "select distinct o.till_id "
                "from ordr o "
                "   join till t on o.till_id = t.id "
                "   join node n on t.node_id = n.id "
                "where n.id = $1 or $1 = any(n.parent_ids) "
                "order by o.till_id",
                node.id,
            ):



                ## ich hab keinen bock mir jetzt alle spezialfälle durchzudenken was zu tun ist wenn eine TSE ausfällt oder so,
                ## darum jetzt nur der Fall, wenn alle TSEs sauber durchlaufen und die Kasse nur eine TSE hat(te)
                ## falls das nicht def Fall ist muss man das halt im ELSTER vor dem Absenden manuell anpassen.


               # Prüfe, ob diese Kasse verschiedene TSEs hatte, wenn nicht, dann müssen wir nichts weiter tun. Das sollte der Normalfall sein:
                till_history = await conn.fetch("select what, tse_id, z_nr, date from till_tse_history where till_id = $1 order by z_nr", str(row['till_id']))
                tses = list()
                for entry in till_history:
                    if entry["what"] == "register":
                        tses.append(entry["tse_id"])
                if len(tses) == 1:
                    # Fall, dass wir nur eine TSE für diese Kasse haben: Einfach
                    tse_data = await conn.fetchrow(
                        "select tse.id, tse.serial, tse.tsedescription, tse.certificatedate "
                        "from till join tse on till.tse_id = tse.id where till.id = $1",
                        row['till_id'],
                    )

                    # oh gott, es gibt noch einen Fall: eine Kasse wird von der defekten TSE geschoben,
                    # aber hat noch keine Buchung gemacht und somit noch keine neue TSE erhalten -> das Feld tse_id in till ist Null
                    # damit schlägt natürlich der join fehl und es kommt None zurück.
                    if tse_data is None:
                        print(f"Kasse {row['till_id']} hat die TSE: {aktuelle_tse_id} und wurde bisher noch nicht auf eine neue TSE registriert")
                        tse_data = dict()
                        tse_data['serial'] = '00000000000000000000000000000000' #machs selber
                        tse_data['tsedescription'] = '0000' #machs selber
                        tse_data['certificatedate'] = '0000' #machs selber

                elif len(tses) == 0:
                    print(f"Kasse {row['till_id']} wurde bei keiner TSE registriert")
                    raise ValueError  # sollte nicht passieren
                else:
                    print(f"KASSE {row['till_id']} wurde bei mehreren TSEs registriert, nämlich bei {tses}")
                    # Fall, dass bei dieser Kasse die TSE gewechselt wurde: Kompliziert :(
                    # machs selbst
                    tse_data = dict()
                    tse_data['serial'] = '00000000000000000000000000000000' #machs selber
                    tse_data['tsedescription'] = '0000' #machs selber
                    tse_data['certificatedate'] = '0000' #machs selber


                first_booking_date = await conn.fetchval("select booked_at from ordr where till_id=$1 order by booked_at limit 1", row['till_id'])

                AngabenAufzeichnungssystem = ET.Element("AngabenAufzeichnungssystem")
                AngabenAufzeichnungssystem
                #gather all data for this till
                Art = ET.SubElement(AngabenAufzeichnungssystem, "Art")
                Art.text = "1" # "Computergestützte/PC-Kassensysteme"

                Software = ET.SubElement(AngabenAufzeichnungssystem, "Software")
                Software.text = "StuStaPay Enterprise Payment Solutions Festival Edition Pro" # KASSE_SW_BRAND
                
                SoftwareVersion = ET.SubElement(AngabenAufzeichnungssystem, "SoftwareVersion")
                SoftwareVersion.text = "v0"  # TODO version? KASSE_SW_VERSION
                
                SeriennummerAS = ET.SubElement(AngabenAufzeichnungssystem, "SeriennummerAS")
                SeriennummerAS.text = str(row['till_id']) # KASSE_SERIENNR
                
                Hersteller = ET.SubElement(AngabenAufzeichnungssystem, "Hersteller")
                Hersteller.text = "StuStaPay" # KASSE_BRAND
                
                Modell = ET.SubElement(AngabenAufzeichnungssystem, "Modell")
                Modell.text = "v0"  # TODO version? KASSE_MODELL
                
                SeriennummerTSE = ET.SubElement(AngabenAufzeichnungssystem, "SeriennummerTSE")
                SeriennummerTSE.text = str(tse_data['serial'])  # TSE
                
                InbetriebnahmeTSE = ET.SubElement(AngabenAufzeichnungssystem, "InbetriebnahmeTSE")
                InbetriebnahmeTSE.text = ""  # öhhh
                
                BSIID = ET.SubElement(AngabenAufzeichnungssystem, "BSIID")
                BSIID.text = str(tse_data['tsedescription'])[-4:] + '-' + str(tse_data['certificatedate'])[0:4]  # 
                
                AnschaffungAS = ET.SubElement(AngabenAufzeichnungssystem, "AnschaffungAS")
                AnschaffungAS.text = str(first_booking_date.strftime("%d.%m.%Y"))  # hmmm
                
                InbetriebnahmeAS = ET.SubElement(AngabenAufzeichnungssystem, "InbetriebnahmeAS")
                InbetriebnahmeAS.text = str(first_booking_date.strftime("%d.%m.%Y")) # we use the first order on this till

                Aufzeichnung146a_1.append(AngabenAufzeichnungssystem)




            LOGGER.info(ET.dump(Aufzeichnung146a_1))
            LOGGER.info(f"Duration: {time.monotonic() - self.starttime:.3f}s")
            return

