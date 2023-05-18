import contextlib
import functools
import logging

import asyncpg

from ..core.subcommand import SubCommand
from .config import Config

from stustapay.core.database import create_db_pool
from stustapay.core.service.common.dbhook import DBHook

from datetime import datetime, timezone
from dateutil import parser
from decimal import Decimal

import pytz
from .dsfinvk.collection import Collection
from .dsfinvk.models import Stamm_Abschluss, Stamm_Orte, Stamm_Kassen, Stamm_USt, Stamm_TSE, Z_GV_Typ, Z_Zahlart, Z_Waehrungen, Bonkopf, Bonkopf_USt, TSE_Transaktionen, Bonkopf_Zahlarten, Bonpos, Bonpos_USt, Bonpos_Preisfindung

from ..tse.wrapper import PAYMENT_METHOD_TO_ZAHLUNGSART
import time

LOGGER = logging.getLogger(__name__)

TAXNAME_TO_SCHLUESSELNUMMER = {'ust': 1, 'eust': 2, 'none': 5, 'transparent': 1337}

class Generator:

    def __init__(self, filename: str, xml: str, dtd: str, simulate: bool):

        self.filename = filename
        self.xml = xml  #path to index.xml file
        self.dtd = dtd  #path to *.dtd file
        self.c = Collection()
        self.simulate = simulate
        self.starttime = time.monotonic()

    async def run(self, db_pool: asyncpg.Pool):

        async with contextlib.AsyncExitStack() as es:
            conn: asyncpg.Connection = await es.enter_async_context(db_pool.acquire())
            self._conn = conn

            #get paymentsystem config
            self.systemconfig = dict()
            rows = await self._conn.fetch("select * from config")
            for row in rows:
                self.systemconfig[row['key']] = row['value']
            LOGGER.info(self.systemconfig)

            #iteriere über alle Kassen Z_KASSE_ID (= KASSE_SERIENNR bei uns)
            #alle Kassen mit einer order (und damit auch mit einer TSE und die deshalb ans Finanzamt gemeldet wurden)
            for row in await self._conn.fetch("select till_id from ordr group by till_id order by till_id"):
                Z_KASSE_ID = row["till_id"]

                #iteriere über Kassenabschlüsse Z_NR dieser Kassen
                for row in  await self._conn.fetch("select z_nr from ordr where till_id = $1 group by z_nr order by z_nr", Z_KASSE_ID): #alle Kassenabschlussids
                    Z_NR = row['z_nr']
                    Z_ERSTELLUNG = datetime.now(timezone.utc).astimezone() #TODO Zeitpunkt des Kassenabschlusses aus der db herausfinden

                    await self.einzelaufzeichnungsmodul(Z_NR, Z_ERSTELLUNG, Z_KASSE_ID) #sammle Einzelaufzeichnungsmodul
                    await self.stammdatenmodul(Z_NR, Z_ERSTELLUNG, Z_KASSE_ID)  #sammle Stammdatenmodul
                    await self.kassenabschlussmodul(Z_NR, Z_ERSTELLUNG, Z_KASSE_ID) #sammle Kassenabschlussmodul

            self.finalize()  #schreibe die Datei
            LOGGER.info(f'Duration: {time.monotonic() - self.starttime:.3f}s')
            return

#######################################################################################################################################

    async def einzelaufzeichnungsmodul(self, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID):




        ### transactions.csv ###
        ### transactions_tse.csv ###
        #alle orders für diese Kasse und Abschluss abfragen:
        for row in await self._conn.fetch("select ordr.id, tse_signature.tse_start, tse_signature.tse_end, tse_signature.tse_id, tse_signature.tse_transaction, tse_signature.transaction_process_type, tse_signature.tse_signaturenr, tse_signature.transaction_process_data, tse_signature.tse_signature, ordr.cashier_id, ordr.customer_account_id, ordr.order_type, tse_signature.signature_status, tse_signature.result_message from ordr join tse_signature on ordr.id=tse_signature.id where ordr.till_id = $1 and ordr.z_nr = $2 order by ordr.id", Z_KASSE_ID, Z_NR):
            if row['signature_status'] == 'new' or row['signature_status'] == 'pending':
                LOGGER.warn("Nicht Signierte Transaktion, wird nicht exportiert")
                continue #signatur noch nicht fertig

            a=Bonkopf()
            b=TSE_Transaktionen()

            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR
            b.Z_KASSE_ID = Z_KASSE_ID
            b.Z_ERSTELLUNG = Z_ERSTELLUNG
            b.Z_NR = Z_NR

            a.BON_ID = row['id']  #bon_id und Bon_nr sind gleich
            a.BON_NR = row['id']
            b.BON_ID = row['id']

            if row['signature_status'] == 'failure':
                b.TSE_TA_FEHLER = f'TSE Fehler: {row["result_message"]}'#TODO Fehlerbehandlung
            else:
                b.TSE_ID = int(row['tse_id'])
                b.TSE_TANR = int(row['tse_transaction'])
                a.BON_START = parser.isoparse(row['tse_start'].split(".")[0]).astimezone()  #TSE_start 
                a.BON_ENDE = parser.isoparse(row['tse_end'].split(".")[0]).astimezone()
                b.TSE_TA_START = parser.isoparse(row['tse_start'].split(".")[0]).astimezone()
                b.TSE_TA_ENDE = parser.isoparse(row['tse_end'].split(".")[0]).astimezone()
                b.TSE_TA_VORGANGSART = row['transaction_process_type']
                b.TSE_TA_SIGZ = int(row['tse_signaturenr'])
                b.TSE_TA_SIG = row['tse_signature']
                b.TSE_TA_VORGANGSDATEN = row['transaction_process_data']


            a.BON_TYP = 'Beleg'
            a.BON_NAME = row['order_type']

            a.BEDIENER_ID = row['cashier_id']  #Kassierer NR

            a.UMS_BRUTTO = Decimal()
            a.KUNDE_ID = row['customer_account_id']

            self.c.add(a)
            self.c.add(b)
        ### /transactions_tse.csv ###
        ### /transactions.csv ###

        ### transactions_vat.csv ###
        a=Bonkopf_USt()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        ### /transactions_vat.csv ###

        ### datapayment.csv ###
        a=Bonkopf_Zahlarten()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        ### /datapayment.csv ###


        ### lines.csv ###
        a=Bonpos()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        ### /lines.csv ###


        ### lines_vat.csv ###
        a=Bonpos_USt()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        ### /lines_vat.csv ###

        ### itemamounts.csv ###
        a=Bonpos_Preisfindung()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        ### /itemamounts.csv ###
        
        return


########################################################################################################################################
    async def stammdatenmodul(self, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID):
        ### cashpointclosing.csv ###
        a = Stamm_Abschluss()
        #wir haben für jeden Kassenabschluss und Kasse immer die gleichen Stammdaten (pro Festival)
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.TAXONOMIE_VERSION = '2.3'  #aktuelle version der DSFinV-K
        a.NAME = self.systemconfig['bon.issuer']
        a.STRASSE = self.systemconfig['bon.addr'].split('\n')[0]
        a.PLZ = self.systemconfig['bon.addr'].split('\n')[1].split(' ')[0]
        a.ORT = self.systemconfig['bon.addr'].split('\n')[1].split(' ')[1]
        a.LAND = 'DEU'  #sorry, not in db -> hardcoded
        a.STNR = ''
        a.USTID = self.systemconfig['ust_id']

        a.Z_START_ID = await self._conn.fetchval("select id from ordr where ordr.till_id = $1 and ordr.z_nr = $2 order by ordr.id asc",Z_KASSE_ID,Z_NR)  #erste BON_ID in diesem Abschluss
        a.Z_ENDE_ID  = await self._conn.fetchval("select id from ordr where ordr.till_id = $1 and ordr.z_nr = $2 order by ordr.id asc",Z_KASSE_ID,Z_NR)  #letzte BON_ID in diesem Abschluss
        
        Z_SE_ZAHLUNGEN = Decimal()
        Z_SE_BARZAHLUNGEN = Decimal()
        for row in await self._conn.fetch("select total_price, payment_method from line_item join ordr on line_item.order_id=ordr.id where ordr.till_id = $1 and ordr.z_nr = $2", Z_KASSE_ID, Z_NR):
            Z_SE_ZAHLUNGEN += Decimal(row['total_price'])
            if PAYMENT_METHOD_TO_ZAHLUNGSART[row['payment_method']] == 'Bar':
               Z_SE_BARZAHLUNGEN += Decimal(row['total_price'])

        a.Z_SE_ZAHLUNGEN = Z_SE_ZAHLUNGEN  #Summe alle Zahlungen dieser Kasse für diesen Kassenabschluss
        a.Z_SE_BARZAHLUNGEN = Z_SE_BARZAHLUNGEN  #Summe alle Barzahlungen dieser Kasse für diesen Kassenabschluss

        self.c.add(a)
        ### \cashpointclosing.csv ###

        ### locations.csv ###
        LOGGER.debug("Stamm_Orte start")
        a = Stamm_Orte()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR

        a.LOC_NAME = self.systemconfig['bon.issuer']
        a.LOC_STRASSE = self.systemconfig['bon.addr'].split('\n')[0]
        a.LOC_PLZ = self.systemconfig['bon.addr'].split('\n')[1].split(' ')[0]
        a.LOC_ORT = self.systemconfig['bon.addr'].split('\n')[1].split(' ')[1]
        a.LOC_LAND = 'DEU'  #sorry, not in db -> hardcoded
        a.USTID = self.systemconfig['ust_id']

        self.c.add(a)
        ### \locations.csv ###

        ### cashregister.csv ###
        a = Stamm_Kassen()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.KASSE_BRAND = 'StuStaPay'
        a.KASSE_MODELL = 'v0'  #TODO version?
        a.KASSE_SERIENNR = str(Z_KASSE_ID)
        a.KASSE_SW_BRAND = 'StuStaPay'
        a.KASSE_SW_VERSION = 'v0'  #TODO version?
        a.KASSE_BASISWAEH_CODE = self.systemconfig['currency.identifier']
        a.KASSE_UST_ZUORDNUNG = '' #puh?
        
        self.c.add(a)
        ### \cashregister.csv ###

        ### vat.csv ###
        for row in await self._conn.fetch("select name, rate, description from tax"):
            a = Stamm_USt()
            a.Z_KASSE_ID = Z_KASSE_ID
            a.Z_ERSTELLUNG = Z_ERSTELLUNG
            a.Z_NR = Z_NR

            a.UST_SCHLUESSEL = TAXNAME_TO_SCHLUESSELNUMMER[row['name']]
            a.UST_SATZ = Decimal(row['rate']*100)
            a.UST_BESCHR = row['description']
            self.c.add(a)

        ### \vat.csv ###

        ### tse.csv ###
        a = Stamm_TSE()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        row = await self._conn.fetchrow("select tse.tse_id, tse.tse_serial, tse.tse_hashalgo, tse.tse_time_format, tse.tse_process_data_encoding, tse.tse_public_key, tse.tse_certificate from till join tse on till.tse_id = tse.tse_id where till.id = $1 and till.z_nr = $2", Z_KASSE_ID, Z_NR)
        a.TSE_ID = int(row['tse_id'])
        a.TSE_SERIAL = row['tse_serial']
        a.TSE_SIG_ALGO = row['tse_hashalgo']
        a.TSE_ZEITFORMAT = row['tse_time_format']
        a.TSE_PD_ENCODING = row['tse_process_data_encoding']
        a.TSE_PUBLIC_KEY = row['tse_public_key']
        if len(row['tse_certificate']) < 1001:
            a.TSE_ZERTIFIKAT_I = row['tse_certificate']
        elif len(row['tse_certificate']) > 1000 and len(row['tse_certificate']) < 2001:
            a.TSE_ZERTIFIKAT_I = row['tse_certificate'][0:1000]
            a.TSE_ZERTIFIKAT_II = row['tse_certificate'][1001:]
        else:
            LOGGER.error(f"Zertifikat zu lang. Länge: {len(row['tse_certificate'])} Zeichen. Maximal unterstützt: 2000 Zeichen")
            raise NotImplemented

        self.c.add(a)
        ### \tse.csv ###

        return


############################################################################################################
    async def kassenabschlussmodul(self, Z_NR, Z_ERSTELLUNG, Z_KASSE_ID):

        paymentmethods = await self._conn.fetch("select payment_method from line_item join ordr on line_item.order_id=ordr.id where ordr.till_id = $1 and ordr.z_nr = $2 group by payment_method", Z_KASSE_ID, Z_NR)
        barzahlungen = Decimal(0)
        summe_je_zahlart = dict()
        for method in paymentmethods:
            summe_je_zahlart[str(method['payment_method'])] = Decimal(0)

        for row in await self._conn.fetch("select total_price, payment_method from line_item join ordr on line_item.order_id=ordr.id where ordr.till_id = $1 and ordr.z_nr = $2", Z_KASSE_ID, Z_NR):
            summe_je_zahlart[row['payment_method']] += Decimal(row['total_price'])
            if PAYMENT_METHOD_TO_ZAHLUNGSART[row['payment_method']] == 'Bar':
               barzahlungen += Decimal(row['total_price'])

        ### businesscases.csv###
        a = Z_GV_Typ()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        #a.GV_TYP
        #a.GV_NAME
        a.AGENTUR_ID = 0 #TODO: Agentur hart auf 0, andere Agenturen not implemented
        #a.UST_SCHLUESSEL
        #a.Z_UMS_BRUTTO
        #a.Z_UMS_NETTO
        #a.Z_UST
        #TODO
        ### \businesscases.csv###


        ### payment.csv###
        a = Z_Zahlart()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        for typ in paymentmethods:
            a.ZAHLART_TYP = PAYMENT_METHOD_TO_ZAHLUNGSART[typ['payment_method']]
            a.ZAHLART_NAME = typ['payment_method']
            a.Z_ZAHLART_BETRAG = summe_je_zahlart[typ['payment_method']]
            self.c.add(a)
        ### \payment.csv###

        ### cash_per_currency.csv###
        a = Z_Waehrungen()
        a.Z_KASSE_ID = Z_KASSE_ID
        a.Z_ERSTELLUNG = Z_ERSTELLUNG
        a.Z_NR = Z_NR
        a.ZAHLART_WAEH = self.systemconfig['currency.identifier']
        a.ZAHLART_BETRAG_WAEH = barzahlungen  #Gesamtsumme der Barzahlungen je Währung (... wir nehmen nur eine!)
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

