import contextlib
import logging
import time
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from dateutil import parser
from sftkit.database import Connection

from stustapay import __version__ as stustapay_version
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.schema.tax_type import TaxType
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.dsfinvk.gv_typ import gv_typ_for_line_item, kundetyp_for_order_type
from stustapay.dsfinvk.tax_type import dsfinvk_schluessel_for_tax_type
from stustapay.tse.till_tse_lookup import get_tse_masterdata_for_till_at_z_nr
from stustapay.tse.zahlungsart import zahlungsart_for_payment_method

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

DSFINVK_ASSETS = Path(__file__).parent / "assets"
DEFAULT_INDEX_XML = DSFINVK_ASSETS / "index.xml"
DEFAULT_DTD = DSFINVK_ASSETS / "gdpdu-01-09-2004.dtd"

CERTIFICATE_CHUNK_SIZE = 1000


class BNU:
    Brutto = Decimal(0)
    Netto = Decimal(0)
    USt = Decimal(0)


def _parse_tse_timestamp(value: str) -> datetime:
    if "." in value:
        value = value.split(".", 1)[0]
    return parser.isoparse(value).astimezone()


def _assign_certificate_chunks(target: Stamm_TSE, certificate: str) -> None:
    max_chunks = 5
    max_length = CERTIFICATE_CHUNK_SIZE * max_chunks
    if len(certificate) > max_length:
        LOGGER.error(
            "Certificate too long. Length: %s characters. Maximal supported: %s characters",
            len(certificate),
            max_length,
        )
        raise NotImplementedError
    chunk_names = [
        "TSE_ZERTIFIKAT_I",
        "TSE_ZERTIFIKAT_II",
        "TSE_ZERTIFIKAT_III",
        "TSE_ZERTIFIKAT_IV",
        "TSE_ZERTIFIKAT_V",
    ]
    for index, chunk_name in enumerate(chunk_names):
        start = index * CERTIFICATE_CHUNK_SIZE
        end = start + CERTIFICATE_CHUNK_SIZE
        chunk = certificate[start:end]
        if chunk:
            setattr(target, chunk_name, chunk)


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

    async def run(self):
        async with contextlib.AsyncExitStack() as es:
            db = get_database(self.config.database)
            db_pool = await db.create_pool(n_connections=2)
            es.push_async_callback(db_pool.close)
            conn: Connection = await es.enter_async_context(db_pool.acquire())
            content = await self.generate(conn)
            if content is not None:
                with open(self.filename, "wb") as output_file:
                    output_file.write(content)
            LOGGER.info(f"Duration: {time.monotonic() - self.starttime:.3f}s")

    async def generate(self, conn: Connection) -> bytes | None:
        node = await fetch_node(conn=conn, node_id=self.node_id)
        assert node is not None
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=self.node_id)

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
            for inner_row in await conn.fetch(
                "select z_nr from ordr where till_id = $1 group by z_nr order by z_nr", Z_KASSE_ID
            ):  # alle Kassenabschlussids
                Z_NR: int = inner_row["z_nr"]

                # hole alle order dieser Kasse und Kassenabschluss und nimm den Zeitpunkt der letzten für den Kassenabschluss
                last_order_time = await conn.fetchval(
                    "select booked_at from ordr where till_id = $1 and z_nr = $2 order by id desc", Z_KASSE_ID, Z_NR
                )
                Z_ERSTELLUNG: datetime = last_order_time

                # sammle Einzelaufzeichnungsmodul
                await self.einzelaufzeichnungsmodul(conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, event_settings=event_settings)
                # sammle Stammdatenmodul
                await self.stammdatenmodul(
                    conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, node=node, event_settings=event_settings
                )
                # sammle Kassenabschlussmodul
                await self.kassenabschlussmodul(conn, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID, event_settings=event_settings)

        return self.finalize()

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
                b.TSE_TA_FEHLER = f"TSE Fehler: {row['result_message']}"  # TODO Fehlerbehandlung
            else:
                b.TSE_ID = int(row["tse_id"])
                b.TSE_TANR = int(row["tse_transaction"])
                a.BON_START = _parse_tse_timestamp(row["tse_start"])
                a.BON_ENDE = _parse_tse_timestamp(row["tse_end"])
                b.TSE_TA_START = _parse_tse_timestamp(row["tse_start"])
                b.TSE_TA_ENDE = _parse_tse_timestamp(row["tse_end"])
                b.TSE_TA_VORGANGSART = row["transaction_process_type"]
                b.TSE_TA_SIGZ = int(row["tse_signaturenr"])
                b.TSE_TA_SIG = row["tse_signature"]
                b.TSE_TA_VORGANGSDATEN = row["transaction_process_data"]

            a.BON_TYP = "Beleg"
            a.BON_NAME = row["order_type"]

            a.BEDIENER_ID = row["cashier_id"]  # Kassierer NR

            a.UMS_BRUTTO = Decimal(row["total_price"])
            a.KUNDE_ID = row["customer_account_id"]
            a.KUNDE_TYP = kundetyp_for_order_type(row["order_type"])

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
                    "select tax_type, total_price, total_tax, total_no_tax from order_tax_rates where id = $1",
                    row["id"],
                ):
                    c = Bonkopf_USt()
                    c.Z_KASSE_ID = Z_KASSE_ID
                    c.Z_ERSTELLUNG = Z_ERSTELLUNG
                    c.Z_NR = Z_NR

                    c.BON_ID = row["id"]
                    c.UST_SCHLUESSEL = dsfinvk_schluessel_for_tax_type(TaxType(line["tax_type"]))
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
            d.ZAHLART_TYP = zahlungsart_for_payment_method(row["payment_method"])
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

                gvtyp = gv_typ_for_line_item(
                    order_type=row["order_type"],
                    product_type=item["product"]["type"],
                    is_returnable=item["product"]["is_returnable"],
                    total_price=Decimal(item["total_price"]),
                )

                tax_type = TaxType(item["product"]["tax_type"])
                schluessel = dsfinvk_schluessel_for_tax_type(tax_type)
                self.GV_SUMME[gvtyp][schluessel].Brutto += Decimal(item["total_price"])
                self.GV_SUMME[gvtyp][schluessel].USt += Decimal(item["total_tax"])
                self.GV_SUMME[gvtyp][schluessel].Netto += Decimal(item["total_price"]) - Decimal(item["total_tax"])
                e.GV_TYP = gvtyp

                e.GV_NAME = ""

                f = Bonpos_USt()
                f.Z_KASSE_ID = Z_KASSE_ID
                f.Z_ERSTELLUNG = Z_ERSTELLUNG
                f.Z_NR = Z_NR
                f.BON_ID = row["id"]
                f.POS_ZEILE = int(item["item_id"]) + 1
                f.UST_SCHLUESSEL = dsfinvk_schluessel_for_tax_type(TaxType(item["product"]["tax_type"]))
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
        a.STRASSE = event_settings.bon_street
        a.PLZ = event_settings.bon_zip
        a.ORT = event_settings.bon_city
        a.LAND = event_settings.bon_country
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
            if zahlungsart_for_payment_method(row["payment_method"]) == "Bar":
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
        a.LOC_STRASSE = event_settings.bon_street
        a.LOC_PLZ = event_settings.bon_zip
        a.LOC_ORT = event_settings.bon_city
        a.LOC_LAND = event_settings.bon_country
        a.USTID = event_settings.ust_id

        self.c.add(a)
        ### \locations.csv ###

        ### cashregister.csv ###

        kasse_brand, kasse_modell, kasse_sw_brand = await conn.fetchrow(
            "select dsfinvk_brand, dsfinvk_model, dsfinvk_software_brand from till where id = $1", Z_KASSE_ID
        )
        a = Stamm_Kassen()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.KASSE_BRAND = kasse_brand
        a.KASSE_MODELL = kasse_modell
        a.KASSE_SERIENNR = str(Z_KASSE_ID)
        a.KASSE_SW_BRAND = kasse_sw_brand
        a.KASSE_SW_VERSION = stustapay_version
        a.KASSE_BASISWAEH_CODE = event_settings.currency_identifier
        a.KASSE_UST_ZUORDNUNG = ""  # puh?

        self.c.add(a)
        ### \cashregister.csv ###

        ### vat.csv ###
        for row in await conn.fetch(
            "select name, rate, description, tax_type from tax_rate where node_id = $1", node.id
        ):
            a = Stamm_USt()
            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR

            a.UST_SCHLUESSEL = dsfinvk_schluessel_for_tax_type(TaxType(row["tax_type"]))
            a.UST_SATZ = Decimal(row["rate"] * 100)
            a.UST_BESCHR = row["description"]
            self.c.add(a)

        ### \vat.csv ###

        ### tse.csv ###
        a = Stamm_TSE()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR

        row = await get_tse_masterdata_for_till_at_z_nr(conn=conn, till_id=Z_KASSE_ID, z_nr=Z_NR)
        if row is None:
            raise InvalidArgument(f"Kasse {Z_KASSE_ID} wurde bei keiner TSE registriert")

        LOGGER.info("Kasse %s hat beim Abschluss %s die TSE: %s", Z_KASSE_ID, Z_NR, row["id"])
        a.TSE_ID = int(row["id"])
        a.TSE_SERIAL = row["serial"]
        a.TSE_SIG_ALGO = row["hashalgo"]
        a.TSE_ZEITFORMAT = row["time_format"]
        a.TSE_PD_ENCODING = row["process_data_encoding"]
        a.TSE_PUBLIC_KEY = row["public_key"]
        _assign_certificate_chunks(a, row["certificate"])

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
            if zahlungsart_for_payment_method(row["payment_method"]) == "Bar":
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
            a.ZAHLART_TYP = zahlungsart_for_payment_method(typ["payment_method"])
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

    def finalize(self) -> bytes | None:
        if self.simulate:
            print(self.c)
            LOGGER.info("Simulation; No file written.")
            return None
        LOGGER.info("write file")
        return self.c.write_bytes(self.xml, self.dtd)
