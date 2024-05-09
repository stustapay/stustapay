import contextlib
import logging
import time
from datetime import datetime
from decimal import Decimal

from dateutil import parser

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.framework.database import Connection, create_db_pool
from stustapay.tse.wrapper import PAYMENT_METHOD_TO_ZAHLUNGSART

from .dsfinvk.collection import Collection
from .dsfinvk.models import (
    Bonkopf,
    Bonkopf_USt,
    Bonkopf_Zahlarten,
    Bonpos,
    Bonpos_USt,
    Stamm_Abschluss,
    Stamm_Kassen,
    Stamm_Orte,
    Stamm_TSE,
    Stamm_USt,
    TSE_Transaktionen,
    Z_GV_Typ,
    Z_Waehrungen,
    Z_Zahlart,
)

LOGGER = logging.getLogger(__name__)

TAXNAME_TO_SCHLUESSELNUMMER = {"ust": 1, "eust": 2, "none": 5, "transparent": 1337}
ORDERTYPE_TO_KUNDETYP = {
    "top_up": "Kunde",
    "sale": "Kunde",
    "cancel_sale": "Kunde",
    "pay_out": "Kunde",
    "ticket": "Kunde",
    "money_transfer": "intern",
    "money_transfer_imbalance": "intern",
}


class BNU:
    Brutto = Decimal(0)
    Netto = Decimal(0)
    USt = Decimal(0)


class Generator:
    def __init__(self, config: Config, event_node_id: int, filename: str, xml: str, dtd: str, simulate: bool):
        self.node_id = event_node_id
        self.config = config
        self.filename = filename
        self.xml = xml  # path to index.xml file
        self.dtd = dtd  # path to *.dtd file
        self.c = Collection()
        self.simulate = simulate
        self.starttime = time.monotonic()
        self.GV_SUMME: dict = dict()  # aufsummierte Geschäftsvorfalltypen
        self.PLZ = ""
        self.Street = ""
        self.City = ""

    async def run(self):
        async with contextlib.AsyncExitStack() as es:
            db_pool = await create_db_pool(self.config.database)
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

            # iteriere über alle Kassen Z_KASSE_ID (= KASSE_SERIENNR bei uns)
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
                Z_KASSE_ID: int = row["till_id"]

                # iteriere über Kassenabschlüsse Z_NR dieser Kassen
                for row in await conn.fetch(
                    "select z_nr from ordr where till_id = $1 group by z_nr order by z_nr", Z_KASSE_ID
                ):  # alle Kassenabschlussids
                    Z_NR: int = row["z_nr"]

                    # hole alle order dieser Kasse und Kassenabschluss und nimm den Zeitpunkt der letzten für den Kassenabschluss
                    last_order_time = await conn.fetchval(
                        "select booked_at from ordr where till_id = $1 and z_nr = $2 order by id desc", Z_KASSE_ID, Z_NR
                    )
                    Z_ERSTELLUNG: datetime = last_order_time

                    # sammle Einzelaufzeichnungsmodul
                    await self.einzelaufzeichnungsmodul(
                        conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, event_settings=event_settings
                    )
                    # sammle Stammdatenmodul
                    await self.stammdatenmodul(
                        conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, node=node, event_settings=event_settings
                    )
                    # sammle Kassenabschlussmodul
                    await self.kassenabschlussmodul(conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, event_settings=event_settings)

            self.finalize()  # schreibe die Datei
            LOGGER.info(f"Duration: {time.monotonic() - self.starttime:.3f}s")
            return

    async def einzelaufzeichnungsmodul(
        self, conn, Z_NR: int, Z_ERSTELLUNG: datetime, Z_KASSE_ID: int, event_settings: RestrictedEventSettings
    ):
        self.GV_SUMME = {
            "MehrzweckgutscheinKauf": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "Geldtransit": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "DifferenzSollIst": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "Pfand": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "PfandRueckzahlung": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "MehrzweckgutscheinEinloesung": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
            "Umsatz": {1: BNU(), 2: BNU(), 5: BNU(), 1337: BNU()},
        }  # leeren

        ### a transactions.csv ###
        ### b transactions_tse.csv ###
        ### c transactions_vat.csv ###
        ### d datapayment.csv ###
        # alle orders für diese Kasse und Abschluss abfragen:
        for row in await conn.fetch(
            """
            select
                ordr.id,
                ordr.payment_method,
                ordr.cash_register_id,
                ordr.cancels_order,
                tse_signature.tse_start,
                tse_signature.tse_end,
                tse_signature.tse_id,
                tse_signature.tse_transaction,
                tse_signature.transaction_process_type,
                tse_signature.tse_signaturenr,
                tse_signature.transaction_process_data,
                tse_signature.tse_signature,
                ordr.cashier_id,
                ordr.customer_account_id,
                ordr.order_type,
                ordr.item_count,
                tse_signature.signature_status,
                tse_signature.result_message,
                order_value.total_price,
                order_value.line_items
            from
                ordr
            join
                tse_signature on ordr.id=tse_signature.id
            join
                order_value on ordr.id=order_value.id
            where
                ordr.till_id = $1
                and ordr.z_nr = $2
            order by
                ordr.id
            """,
            Z_KASSE_ID,
            Z_NR,
        ):
            if row["signature_status"] == "new" or row["signature_status"] == "pending":
                LOGGER.warning("Nicht Signierte Transaktion, wird nicht exportiert")
                continue  # signatur noch nicht fertig

            a = Bonkopf()
            b = TSE_Transaktionen()

            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR
            b.Z_KASSE_ID = Z_KASSE_ID
            b.Z_ERSTELLUNG = Z_ERSTELLUNG
            b.Z_NR = Z_NR

            a.BON_ID = row["id"]  # bon_id und Bon_nr sind gleich
            a.BON_NR = row["id"]
            b.BON_ID = row["id"]

            if row["signature_status"] == "failure":
                b.TSE_TA_FEHLER = f'TSE Fehler: {row["result_message"]}'  # TODO Fehlerbehandlung
            else:
                b.TSE_ID = int(row["tse_id"])
                b.TSE_TANR = int(row["tse_transaction"])
                a.BON_START = parser.isoparse(row["tse_start"].split(".")[0]).astimezone()  # TSE_start
                a.BON_ENDE = parser.isoparse(row["tse_end"].split(".")[0]).astimezone()
                b.TSE_TA_START = parser.isoparse(row["tse_start"].split(".")[0]).astimezone()
                b.TSE_TA_ENDE = parser.isoparse(row["tse_end"].split(".")[0]).astimezone()
                b.TSE_TA_VORGANGSART = row["transaction_process_type"]
                b.TSE_TA_SIGZ = int(row["tse_signaturenr"])
                b.TSE_TA_SIG = row["tse_signature"]
                b.TSE_TA_VORGANGSDATEN = row["transaction_process_data"]

            a.BON_TYP = "Beleg"
            a.BON_NAME = row["order_type"]

            a.BEDIENER_ID = row["cashier_id"]  # Kassierer NR

            a.UMS_BRUTTO = Decimal(row["total_price"])
            a.KUNDE_ID = row["customer_account_id"]
            a.KUNDE_TYP = ORDERTYPE_TO_KUNDETYP[row["order_type"]]

            # Storno
            if row["cancels_order"] is not None:
                a.BON_NOTIZ = f"Storno von BON_ID {row['cancels_order']}"
                a.BON_STORNO = True
            else:
                pass

            # einmal über alle Umsatzsteuersätze je Order iterieren
            # leider müssen wir da wieder eine db abfrage machen....
            if row["item_count"] != 0:
                for line in await conn.fetch(
                    "select tax_name, total_price, total_tax, total_no_tax from order_tax_rates where id = $1",
                    row["id"],
                ):
                    c = Bonkopf_USt()
                    c.Z_KASSE_ID = Z_KASSE_ID
                    c.Z_ERSTELLUNG = Z_ERSTELLUNG
                    c.Z_NR = Z_NR

                    c.BON_ID = row["id"]
                    c.UST_SCHLUESSEL = TAXNAME_TO_SCHLUESSELNUMMER[line["tax_name"]]
                    c.BON_BRUTTO = Decimal(line["total_price"])
                    c.BON_NETTO = Decimal(line["total_no_tax"])
                    c.BON_UST = Decimal(line["total_tax"])

                    self.c.add(c)
            else:
                LOGGER.warning(f"Order {row['id']} has no line_items...")

            d = Bonkopf_Zahlarten()  # eigentlich nur eine Zahlart pro Order, AUßER es wird ein Gutschein eingesetzt
            d.Z_KASSE_ID = Z_KASSE_ID
            d.Z_ERSTELLUNG = Z_ERSTELLUNG
            d.Z_NR = Z_NR
            # TODO Gutscheinfall? vielleicht auch in die Datei Bonpos_Preisfindung, Zahlart ist eh immer 'tag'?
            d.BON_ID = row["id"]
            d.ZAHLART_TYP = PAYMENT_METHOD_TO_ZAHLUNGSART[row["payment_method"]]  # 'Bar'/'Unbar'
            d.ZAHLART_NAME = row["payment_method"]
            d.ZAHLWAEH_CODE = event_settings.currency_identifier
            d.ZAHLWAEH_BETRAG = Decimal(0)  # Fremdwährung, bei uns immer 0
            d.BASISWAEH_BETRAG = Decimal(row["total_price"])  # Bezahlter betrag in Grundwährung
            d.KASSENSCHUBLADENNR = row[
                "cash_register_id"
            ]  # Nummer der Kassenschublade (nur bei Kassen, die Bargeld annehmen), Eigenkreation in Anlehnung an FAQ vom Bundesfinanzministerium zum Kassengesetz
            self.c.add(d)

            self.c.add(a)
            self.c.add(b)
            ### /datapayment.csv ###
            ### /transactions_vat.csv ###
            ### /transactions_tse.csv ###
            ### /transactions.csv ###

            # so, und jetzt noch für jede dieser Transaktionen noch die einzelnen Zeilen
            ### lines.csv ###
            for item in row["line_items"]:
                e = Bonpos()
                e.Z_KASSE_ID = Z_KASSE_ID
                e.Z_ERSTELLUNG = Z_ERSTELLUNG
                e.Z_NR = Z_NR
                e.BON_ID = row["id"]
                e.POS_ZEILE = item["item_id"] + 1  # weiß nicht, ob das Finanzamt bei 0 anfängt zu zählen
                e.ARTIKELTEXT = item["product"]["name"]
                e.ART_NR = item["product"]["id"]
                e.MENGE = Decimal(item["quantity"])
                e.INHAUS = False  # TODO nachgucken, ob wichtig. jetzt erstmal alles als Außerhausverkauf
                e.P_STORNO = False  # nicht vorgesehen
                e.AGENTUR_ID = 0  # Agenturen noch nicht implementiert

                # finde den Geschäftsvorfalltyp dieses "Artikels" heraus...
                if row["order_type"] == "top_up" or row["order_type"] == "pay_out":
                    gvtyp = "MehrzweckgutscheinKauf"
                elif row["order_type"] == "money_transfer":
                    gvtyp = "Geldtransit"

                elif row["order_type"] == "money_transfer_imbalance":
                    gvtyp = "DifferenzSollIst"

                elif row["order_type"] == "sale":
                    if item["product"]["is_returnable"] and item["total_price"] > 0:
                        gvtyp = "Pfand"

                    elif item["product"]["is_returnable"] and item["total_price"] < 0:
                        gvtyp = "PfandRueckzahlung"

                    else:
                        gvtyp = "MehrzweckgutscheinEinloesung"
                elif row["order_type"] == "ticket":
                    if item["product"]["name"].startswith(
                        "Eintritt"
                    ):  # TODO Eintritt kann nicht anders benannt werden, muss evtl noch spezielles Flag bekommen
                        gvtyp = "Umsatz"  # Eintritt
                    elif (
                        item["product"]["name"] == "Aufladen"
                    ):  # TODO besser noch, alle Aufladeoperationen bekommen ein bestimmtes Flag
                        gvtyp = "MehrzweckgutscheinKauf"

                else:
                    gvtyp = "Umsatz"  # alles andere

                self.GV_SUMME[gvtyp][int(TAXNAME_TO_SCHLUESSELNUMMER[item["tax_name"]])].Brutto += Decimal(
                    item["total_price"]
                )
                self.GV_SUMME[gvtyp][int(TAXNAME_TO_SCHLUESSELNUMMER[item["tax_name"]])].USt += Decimal(
                    item["total_tax"]
                )
                self.GV_SUMME[gvtyp][int(TAXNAME_TO_SCHLUESSELNUMMER[item["tax_name"]])].Netto += Decimal(
                    item["total_price"]
                ) - Decimal(item["total_tax"])
                e.GV_TYP = gvtyp

                e.GV_NAME = ""

                f = Bonpos_USt()
                f.Z_KASSE_ID = Z_KASSE_ID
                f.Z_ERSTELLUNG = Z_ERSTELLUNG
                f.Z_NR = Z_NR
                f.BON_ID = row["id"]
                f.POS_ZEILE = int(item["item_id"]) + 1
                f.UST_SCHLUESSEL = TAXNAME_TO_SCHLUESSELNUMMER[item["tax_name"]]
                f.POS_BRUTTO = Decimal(item["total_price"])
                f.POS_UST = Decimal(item["total_tax"])
                f.POS_NETTO = Decimal(item["total_price"]) - Decimal(item["total_tax"])

                self.c.add(e)
                self.c.add(f)

            ### /lines.csv ###

            ### itemamounts.csv ### ##brauchen wir nicht, weil Gutscheine in den Lineitems als Rabatprodukt auftauchen
            # a=Bonpos_Preisfindung()
            # a.Z_KASSE_ID = Z_KASSE_ID
            # a.Z_ERSTELLUNG = Z_ERSTELLUNG
            # a.Z_NR = Z_NR
            ### /itemamounts.csv ###

        return

    async def stammdatenmodul(
        self,
        conn: Connection,
        Z_NR: int,
        Z_ERSTELLUNG: datetime,
        Z_KASSE_ID: int,
        node: Node,
        event_settings: RestrictedEventSettings,
    ):
        ### cashpointclosing.csv ###
        a = Stamm_Abschluss()
        # wir haben für jeden Kassenabschluss und Kasse immer die gleichen Stammdaten (pro Festival)
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.TAXONOMIE_VERSION = "2.3"  # aktuelle version der DSFinV-K
        a.NAME = event_settings.bon_issuer
        a.STRASSE = self.Street
        a.PLZ = self.PLZ
        a.ORT = self.City
        a.LAND = "DEU"  # sorry, not in db -> hardcoded
        a.STNR = ""
        a.USTID = event_settings.ust_id

        a.Z_START_ID = await conn.fetchval(
            "select id from ordr where ordr.till_id = $1 and ordr.z_nr = $2 order by ordr.id asc", Z_KASSE_ID, Z_NR
        )  # erste BON_ID in diesem Abschluss
        a.Z_ENDE_ID = await conn.fetchval(
            "select id from ordr where ordr.till_id = $1 and ordr.z_nr = $2 order by ordr.id desc", Z_KASSE_ID, Z_NR
        )  # letzte BON_ID in diesem Abschluss

        Z_SE_ZAHLUNGEN = Decimal()
        Z_SE_BARZAHLUNGEN = Decimal()
        for row in await conn.fetch(
            "select total_price, payment_method from line_item join ordr on line_item.order_id = ordr.id "
            "where ordr.till_id = $1 and ordr.z_nr = $2",
            Z_KASSE_ID,
            Z_NR,
        ):
            Z_SE_ZAHLUNGEN += Decimal(row["total_price"])
            if PAYMENT_METHOD_TO_ZAHLUNGSART[row["payment_method"]] == "Bar":
                Z_SE_BARZAHLUNGEN += Decimal(row["total_price"])

        a.Z_SE_ZAHLUNGEN = Z_SE_ZAHLUNGEN  # Summe alle Zahlungen dieser Kasse für diesen Kassenabschluss
        a.Z_SE_BARZAHLUNGEN = Z_SE_BARZAHLUNGEN  # Summe alle Barzahlungen dieser Kasse für diesen Kassenabschluss

        self.c.add(a)
        ### \cashpointclosing.csv ###

        ### locations.csv ###
        LOGGER.debug("Stamm_Orte start")
        a = Stamm_Orte()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR

        a.LOC_NAME = event_settings.bon_issuer
        a.LOC_STRASSE = self.Street
        a.LOC_PLZ = self.PLZ
        a.LOC_ORT = self.City
        a.LOC_LAND = "DEU"  # sorry, not in db -> hardcoded
        a.USTID = event_settings.ust_id

        self.c.add(a)
        ### \locations.csv ###

        ### cashregister.csv ###
        a = Stamm_Kassen()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.KASSE_BRAND = "StuStaPay"
        a.KASSE_MODELL = "v0"  # TODO version?
        a.KASSE_SERIENNR = str(Z_KASSE_ID)
        a.KASSE_SW_BRAND = "StuStaPay Enterprise Payment Solutions Festival Edition Pro"
        a.KASSE_SW_VERSION = "v0"  # TODO version?
        a.KASSE_BASISWAEH_CODE = event_settings.currency_identifier
        a.KASSE_UST_ZUORDNUNG = ""  # puh?

        self.c.add(a)
        ### \cashregister.csv ###

        ### vat.csv ###
        for row in await conn.fetch("select name, rate, description from tax_rate where node_id = $1", node.id):
            a = Stamm_USt()
            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR

            a.UST_SCHLUESSEL = TAXNAME_TO_SCHLUESSELNUMMER[row["name"]]
            a.UST_SATZ = Decimal(row["rate"] * 100)
            a.UST_BESCHR = row["description"]
            self.c.add(a)

        ### \vat.csv ###

        ### tse.csv ###
        a = Stamm_TSE()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR

        # Prüfe, ob diese Kasse verschiedene TSEs hatte, wenn nicht, dann müssen wir nichts weiter tun. Das sollte der Normalfall sein:
        till_history = await conn.fetch(
            "select what, tse_id, z_nr, date from till_tse_history where till_id = $1 order by z_nr", str(Z_KASSE_ID)
        )
        tses = list()
        for entry in till_history:
            if entry["what"] == "register":
                tses.append(entry["tse_id"])
        if len(tses) == 1:
            # Fall, dass wir nur eine TSE für diese Kasse haben: Einfach
            row = await conn.fetchrow(
                "select tse.id, tse.serial, tse.hashalgo, tse.time_format, tse.process_data_encoding, tse.public_key, tse.certificate "
                "from till join tse on till.tse_id = tse.id where till.id = $1",
                Z_KASSE_ID,
            )

            # oh gott, es gibt noch einen Fall: eine Kasse wird von der defekten TSE geschoben, aber hat noch keine Buchung gemacht und somit noch keine neue TSE erhalten -> das Feld tse_id in till ist Null
            # damit schlägt natürlich der join fehl und es kommt None zurück.
            if row is None:
                # jetze müssen wir in der history nachschauen, auf welcher TSE diese Kasse registriert war, kann natürlich auch wieder mehrere geben, ahrg
                # dazu kopieren wir jetzt einfach den code von unten
                kassenschlussgrenzen = await conn.fetch(
                    "select z_nr from till_tse_history where till_id = $1 and what = 'register' order by z_nr",
                    str(Z_KASSE_ID),
                )
                aeltereschluesse = list()

                for schluss in kassenschlussgrenzen:
                    # ist der Kassenschluss bei dem die Kasse auf die TSE registriert wurde älter und damit kleiner gleich als der aktuel abgefragte Z_NR?
                    if Z_NR >= schluss["z_nr"]:
                        aeltereschluesse.append(schluss["z_nr"])
                # nimm jetzt den größten weil ältesten Kassenschluss in der Liste und hole die TSE
                aeltereschluesse.sort(reverse=True)
                aktuelle_tse_id = await conn.fetchval(
                    "select tse_id from till_tse_history where till_id = $1 and what = 'register' and z_nr = $2",
                    str(Z_KASSE_ID),
                    aeltereschluesse[0],
                )
                print(
                    f"Kasse {Z_KASSE_ID} hat beim Abschluss {Z_NR} die TSE: {aktuelle_tse_id} und wurde bisher noch nicht auf eine neue TSE registriert"
                )

                # und jetzt die stammdaten dieser TSE
                row = await conn.fetchrow(
                    "select tse.id, tse.serial, tse.hashalgo, tse.time_format, tse.process_data_encoding, "
                    "   tse.public_key, tse.certificate "
                    "from tse where id = $1",
                    aktuelle_tse_id,
                )

        elif len(tses) == 0:
            print(f"Kasse {Z_KASSE_ID} wurde bei keiner TSE registriert")
            raise ValueError  # sollte nicht passieren
        else:
            print(f"KASSE {Z_KASSE_ID} wurde bei mehreren TSEs registriert, nämlich bei {tses}")
            # Fall, dass bei dieser Kasse die TSE gewechselt wurde: Kompliziert :(
            # Erstens: Herausfinden, welche TSE für diesen Kassenschluss zuständig war:
            # ich habe mehrere Einträge, davon muss ich den mit dem kleinsten z_nr nehmen und vergleichen, ob der größer gleich dem aktuellen z_nr ist.
            kassenschlussgrenzen = await conn.fetch(
                "select z_nr from till_tse_history where till_id = $1 and what = 'register' order by z_nr",
                str(Z_KASSE_ID),
            )
            aeltereschluesse = list()

            for schluss in kassenschlussgrenzen:
                # ist der Kassenschluss bei dem die Kasse auf die TSE registriert wurde älter und damit kleiner gleich als der aktuel abgefragte Z_NR?
                if Z_NR >= schluss["z_nr"]:
                    aeltereschluesse.append(schluss["z_nr"])
            # nimm jetzt den größten weil ältesten Kassenschluss in der Liste und hole die TSE
            aeltereschluesse.sort(reverse=True)
            aktuelle_tse_id = await conn.fetchval(
                "select tse_id from till_tse_history where till_id = $1 and what = 'register' and z_nr = $2",
                str(Z_KASSE_ID),
                aeltereschluesse[0],
            )
            print(f"Kasse {Z_KASSE_ID} hat beim Abschluss {Z_NR} die TSE: {aktuelle_tse_id}")

            # und jetzt die stammdaten dieser TSE
            row = await conn.fetchrow(
                "select tse.id, tse.serial, tse.hashalgo, tse.time_format, tse.process_data_encoding, "
                "   tse.public_key, tse.certificate "
                "from tse where id = $1",
                aktuelle_tse_id,
            )

        # LOGGER.info(row)
        # LOGGER.info(f'Z_KASSE_ID: {Z_KASSE_ID}, Z_NR: {Z_NR}')
        a.TSE_ID = int(row["id"])
        a.TSE_SERIAL = row["serial"]
        a.TSE_SIG_ALGO = row["hashalgo"]
        a.TSE_ZEITFORMAT = row["time_format"]
        a.TSE_PD_ENCODING = row["process_data_encoding"]
        a.TSE_PUBLIC_KEY = row["public_key"]
        if len(row["certificate"]) < 1001:
            a.TSE_ZERTIFIKAT_I = row["certificate"]
        elif 1000 < len(row["certificate"]) < 2001:
            a.TSE_ZERTIFIKAT_I = row["certificate"][0:1000]
            a.TSE_ZERTIFIKAT_II = row["certificate"][1001:]
        elif 2001 < len(row["certificate"]) < 3001:
            a.TSE_ZERTIFIKAT_I = row["certificate"][0:1000]
            a.TSE_ZERTIFIKAT_II = row["certificate"][1000:2001]
            a.TSE_ZERTIFIKAT_III = row["certificate"][2000:3001]
        elif 3001 < len(row["certificate"]) < 4001:
            a.TSE_ZERTIFIKAT_I = row["certificate"][0:1000]
            a.TSE_ZERTIFIKAT_II = row["certificate"][1000:2001]
            a.TSE_ZERTIFIKAT_III = row["certificate"][2000:3001]
            a.TSE_ZERTIFIKAT_IV = row["certificate"][3000:4001]
        elif 4001 < len(row["certificate"]) < 5001:
            a.TSE_ZERTIFIKAT_I = row["certificate"][0:1000]
            a.TSE_ZERTIFIKAT_II = row["certificate"][1000:2001]
            a.TSE_ZERTIFIKAT_III = row["certificate"][2000:3001]
            a.TSE_ZERTIFIKAT_IV = row["certificate"][3000:4001]
            a.TSE_ZERTIFIKAT_V = row["certificate"][4000:5001]
        else:
            LOGGER.error(
                f"Zertifikat zu lang. Länge: {len(row['tse_certificate'])} Zeichen. Maximal unterstützt: 5000 Zeichen"
            )
            raise NotImplementedError

        self.c.add(a)
        ### \tse.csv ###

        return

    async def kassenabschlussmodul(
        self,
        conn: Connection,
        Z_NR: int,
        Z_ERSTELLUNG: datetime,
        Z_KASSE_ID: int,
        event_settings: RestrictedEventSettings,
    ):
        paymentmethods = await conn.fetch(
            "select payment_method from line_item join ordr on line_item.order_id = ordr.id "
            "where ordr.till_id = $1 and ordr.z_nr = $2 group by payment_method",
            Z_KASSE_ID,
            Z_NR,
        )
        barzahlungen = Decimal(0)
        summe_je_zahlart = dict()
        for method in paymentmethods:
            summe_je_zahlart[str(method["payment_method"])] = Decimal(0)

        for row in await conn.fetch(
            "select total_price, payment_method from line_item join ordr on line_item.order_id = ordr.id "
            "where ordr.till_id = $1 and ordr.z_nr = $2",
            Z_KASSE_ID,
            Z_NR,
        ):
            summe_je_zahlart[row["payment_method"]] += Decimal(row["total_price"])
            if PAYMENT_METHOD_TO_ZAHLUNGSART[row["payment_method"]] == "Bar":
                barzahlungen += Decimal(row["total_price"])

        ### businesscases.csv###
        # wir iterieren über die daten die wir in im einzelaufzeichnungsmodul aggregiert haben
        for gvtyp, summe in self.GV_SUMME.items():
            for schluessel, betrag in summe.items():
                a = Z_GV_Typ()
                a.Z_KASSE_ID = Z_KASSE_ID
                a.Z_ERSTELLUNG = Z_ERSTELLUNG
                a.Z_NR = Z_NR
                a.GV_TYP = gvtyp
                a.GV_NAME = ""
                a.AGENTUR_ID = 0  # TODO: Agentur hart auf 0, andere Agenturen not implemented
                a.UST_SCHLUESSEL = int(schluessel)
                a.Z_UMS_BRUTTO = betrag.Brutto
                a.Z_UMS_NETTO = betrag.Netto
                a.Z_UST = betrag.USt
                if betrag.Brutto != 0:
                    self.c.add(a)
        ### \businesscases.csv###

        ### payment.csv###
        for typ in paymentmethods:
            a = Z_Zahlart()
            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR
            a.ZAHLART_TYP = PAYMENT_METHOD_TO_ZAHLUNGSART[typ["payment_method"]]
            a.ZAHLART_NAME = typ["payment_method"]
            a.Z_ZAHLART_BETRAG = summe_je_zahlart[typ["payment_method"]]
            self.c.add(a)
        ### \payment.csv###

        ### cash_per_currency.csv###
        a = Z_Waehrungen()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.ZAHLART_WAEH = event_settings.currency_identifier
        a.ZAHLART_BETRAG_WAEH = barzahlungen  # Gesamtsumme der Barzahlungen je Währung (... wir nehmen nur eine!)
        self.c.add(a)
        ### \cash_per_currency.csv###

        return

    ################################################################################################################

    def finalize(self):
        if not self.simulate:
            LOGGER.info("write file")
            self.c.write(self.filename, self.xml, self.dtd)
        else:
            print(self.c)
            LOGGER.info("Simulation; No file written.")
        return
