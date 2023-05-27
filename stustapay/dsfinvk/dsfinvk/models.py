#based on https://github.com/pretix/python-dsfinvk, Coypright rami.io GmbH, Apache Lizenz
#with modifications by StuStaPay, 2023

from .fields import BooleanField, LocalDateTimeField, NumericField, StringField  # , ISODateTimeField
from .table import Model

TAXONOMY_VERSION = "2.3"


class Bonpos(Model):
    """
    3.1.1  Datei: Bonpos
    Die Datei Bonpos enthält die einzelnen Positionen eines Vorgangs mit der Zuordnung
    des korrekten USt-Satzes, der Menge und der Art der gelieferten Gegenstände (§ 14
    Abs. 4 UStG; § 22 Abs. 2 UStG i. V. m. § 63 Abs. 3 UStDV). Zusätzlich ist die Berech-
    nungsmethode der ausweisbaren USt ersichtlich (Brutto oder-Nettomethode). Bei der
    Bruttomethode wird nur der Bruttopreis aufgeführt, bei der Nettomethode der Nettopreis
    und die darauf entfallende Umsatzsteuer.
    """

    _filename = "lines.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    POS_ZEILE = StringField(_d="Zeilennummer", max_length=50)
    GUTSCHEIN_NR = StringField(_d="Gutschein-Nr.", max_length=50)
    ARTIKELTEXT = StringField(_d="Artikeltext", max_length=255)
    POS_TERMINAL_ID = StringField(_d="ID des Positions-Terminals", max_length=50)
    GV_TYP = StringField(_d="Geschäftsvorfall-Art", max_length=30)
    GV_NAME = StringField(_d="Zusatz zu der Geschäftsvorfall-Art", max_length=40)
    INHAUS = BooleanField(_d="Verzehr an Ort und Stelle")
    P_STORNO = BooleanField(_d="Positionsstorno-Kennzeichnung")
    AGENTUR_ID = NumericField(places=0, _d="ID der Agentur")
    ART_NR = StringField(_d="Artikelnummer", max_length=50)
    GTIN = StringField(_d="GTIN", max_length=50)
    WARENGR_ID = StringField(_d="Warengruppen-ID", max_length=40)
    WARENGR = StringField(_d="Bezeichnung Warengruppe", max_length=50)
    MENGE = NumericField(places=3, _d="Menge")
    FAKTOR = NumericField(places=3, _d="Faktor, z. B. Gebindegrößen")
    EINHEIT = StringField(_d="Maßeinheit, z. B. kg, Liter oder Stück", max_length=50)
    STK_BR = NumericField(places=5, _d="Preis pro Einheit inkl. USt")


class Bonpos_USt(Model):
    """
    3.1.1.1  Datei: Bonpos_USt
    Für jede Position werden in dieser Datei die Informationen zu den verwendetUSten -
    Sätzen festgehalten. Da z. B. bei Warenzusammenstellungen mehrere U-SStätze pro
    Position oder bei Rabattierungen mehrere Zeilen mit Preisangaben vorkommen können,
    ist diese Detailtabelle notwendig.
    """

    _filename = "lines_vat.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    POS_ZEILE = StringField(_d="Zeilennummer", max_length=50)
    UST_SCHLUESSEL = NumericField(places=0, _d="ID des USt-Satzes")
    POS_BRUTTO = NumericField(places=5, _d="Bruttoumsatz")
    POS_NETTO = NumericField(places=5, _d="Nettoumsatz")
    POS_UST = NumericField(places=5, _d="USt")


class Bonpos_Preisfindung(Model):
    """
    3.1.1.2  Datei: Bonpos_Preisfindung
    In dieser Tabelle werden Detailangaben zur Entstehung des Preises abgelegt, z. B.
    spezielle Kunden-Rabatte oder auch Aufschläge.
    """

    _filename = "itemamounts.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    POS_ZEILE = StringField(_d="Zeilennummer", max_length=50)
    TYP = StringField(
        _d="Basispreis, Rabatt oder Zuschlag", max_length=20, regex="^(base_amount|discount|extra_amount)$"
    )
    UST_SCHLUESSEL = NumericField(places=0, _d="ID des USt-Satzes")
    PF_BRUTTO = NumericField(places=5, _d="Bruttoumsatz")
    PF_NETTO = NumericField(places=5, _d="Nettoumsatz")
    PF_UST = NumericField(places=5, _d="USt")


class Bonpos_Zusatzinfo(Model):
    """
    3.1.1.3  Datei: Bonpos_Zusatzinfo
    Diese Tabelle schafft die Möglichkeit, die Zusammensetzung von verkauften Produkten
    bzw. Warenzusammenstellungen zu detailileren. Sie dienen ausschließlich der Erläute-
    rung.
    Die umsatzsteuerliche Bemessungsgrundlage wird hierdurch nicht berührt. Bei Waren-
    zusammenstellungen mit unterschiedlichen Steuersätzen werden hier jedoch Informati-
    onen abgelegt, die derK ontrolle der Aufteilung der umsatzsteuerlichen Bemsesungs-
    grundlage dienen (Beispiel: Fastfood-Menü bestehend aus Getränk und Burger).
    Darüber hinaus können von der Standardbestellung abweichende Bestellungen berück-
    sichtigt werden, um den tatsächlichen Warenverbrauch festzuhalten (Beispiel: G-yros
    Teller mit Pommes anstatt mit Reis, Beträge werden hier mit 0,00 dargestellt).
    """

    _filename = "subitems.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    POS_ZEILE = StringField(_d="Zeilennummer", max_length=50)
    ZI_ART_NR = StringField(_d="Artikelnummer", max_length=50)
    ZI_GTIN = StringField(_d="GTIN", max_length=50)
    ZI_NAME = StringField(_d="Artikelbezeichnung", max_length=50)
    ZI_WARENGR_ID = StringField(_d="Warengruppen-ID", max_length=40)
    ZI_WARENGR = StringField(_d="Bezeichnung Warengruppe", max_length=50)
    ZI_MENGE = NumericField(places=3, _d="Menge")
    ZI_FAKTOR = NumericField(places=3, _d="Faktor, z. B. Gebindegrößen")
    ZI_EINHEIT = StringField(_d="Maßeinheit, z. B. kg, Liter oder Stück", max_length=50)
    ZI_UST_SCHLUESSEL = NumericField(places=0, _d="ID USt-Satz des Basispreises")
    ZI_BASISPREIS_BRUTTO = NumericField(places=5, _d="Basispreis brutto")
    ZI_BASISPREIS_NETTO = NumericField(places=5, _d="Basispreis netto")
    ZI_BASISPREIS_UST = NumericField(places=5, _d="Basispreis USt")


class Bonkopf(Model):
    """
    3.1.2  Datei: Bonkopf
    Da es sich im Bonkopf im Regelfall nur um die kumulierten Zahlen aus den einzelnen
    Bonpositionen handelt, ist die o. b. Aufgliederung der einzelnen Zahlen des Bonkopfes
    auf der Positionsebene erforderlich. Aus den Positionsdaten müssen die Daten des
    Bonkopfes ermittelt und insbesondere die Aufteilung des Gesamtumsatzes auf die un-
    terschiedlichen Steuersätze nachvollzogen werden können.

    Um die Nachvollziehbarkeit gewährleisten zu können, ist eine weitgehenhomd  ogene
    Behandlung der verschiedenen Vorgänge in der DSFinVK- erforderlich. Hierbei muss
    genügend Raum bleiben, um den Besonderheiten des einzelnen Kassensystems ge-
    recht zu werden. Aus diesem Grund sind nicht nur die Bezeichnungen standardisiert.
    Auch die Darstellung der besonderen Geschäftsvorfälle ist festgel, egtum eine mög-
    lichst reibungslose Prüfung zu gewährleisten.

    Im Prinzip handelt es sich bei den Angaben im Bonkopf um ein elektronisches „Rech-
    nungsdoppel“, d. h. alle Werte müssen exakt den auf dem Bon aufgedruckten Werten
    entsprechen. Die Werte sollen nicht aus den Positionen „aufsummiert“ werden. Insbe-
    sondere die US-tWerte dienen der Prüfbarkeit des richtigen U-AuSstweises (Hinweis
    auf § 14c UStG).

    Zu speichern sind gem. § 14 Abs. 4 UStG getrennt nach USt-Sätzen insbesondere
       •   Entgelt (netto)
       •   USt-Betrag (Steuerausweis)
    Zusätzlich ist in der DSFinV-K auch der Umsatz (brutto) auszuweisen.
    """

    _filename = "transactions.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    BON_NR = NumericField(places=0, _d="Bonnummer")
    BON_TYP = StringField(_d="Bontyp", max_length=30)
    BON_NAME = StringField(_d="Zusatz-Beschreibung zum Bontyp", max_length=60)
    TERMINAL_ID = StringField(_d="ID des Erfassungsterminals", max_length=50)
    BON_STORNO = BooleanField(_d="Storno-Kennzeichen")
    BON_START = LocalDateTimeField(_d="Zeitpunkt des Vorgangsstarts")
    BON_ENDE = LocalDateTimeField(_d="Zeitpunkt der Vorgangsbeendigung")
    BEDIENER_ID = StringField(_d="Bediener-ID", max_length=50)
    BEDIENER_NAME = StringField(_d="Bediener-Name", max_length=50)
    UMS_BRUTTO = NumericField(places=2, _d="Brutto-Gesamtumsatz")
    KUNDE_NAME = StringField(_d="Name des Leistungsempfängers", max_length=50)
    KUNDE_ID = StringField(_d="Kundennummer des Leistungsempfängers", max_length=50)
    KUNDE_TYP = StringField(_d="Art des Leistungsempfängers (z. B. Mitarbeiter)", max_length=50)
    KUNDE_STRASSE = StringField(_d="Straße und Hausnummer des Leistungsempfängers", max_length=60)
    KUNDE_PLZ = StringField(_d="PLZ des Leistungsempfängers", max_length=10)
    KUNDE_ORT = StringField(_d="Ort des Leistungsempfängers", max_length=62)
    KUNDE_LAND = StringField(_d="Land des Leistungsempfängers", max_length=3)
    KUNDE_USTID = StringField(_d="UStID des Leistungsempfängers", max_length=15)
    BON_NOTIZ = StringField(_d="Zusätzliche Informationen zum Bonkopf", max_length=255)


class Bonkopf_USt(Model):
    """
    3.1.2.1  Datei: Bonkopf_USt
    Da es mehrere US-tSätze pro Bonkopf geben kann, sind diese in einer D-etTabeail lle
    aufgeführt. Hierbei gelten die zum Bonkopf aufgeführten Grundsätze (s. o.).
    """

    _filename = "transactions_vat.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    UST_SCHLUESSEL = NumericField(places=0, _d="ID des USt-Satzes")
    BON_BRUTTO = NumericField(places=2, _d="Bruttoumsatz")
    BON_NETTO = NumericField(places=2, _d="Nettoumsatz")
    BON_UST = NumericField(places=2, _d="USt")


class Bonkopf_AbrKreis(Model):
    """
    3.1.2.2  Datei: Bonkopf_AbrKreis
    Der Abrechnungskreis ist eine variable Einheit, mit der ein Beleg einem bestimmten Kri-
    terium (Tisch, Abteilung etc.) zugeordnet werden kann .Insbesondere in der Gastrono-
    mie können über diese ZuordnungS plittbuchungen und Tischverlegungen nachvollzo-
    gen werden.
    """

    _filename = "allocation_groups.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    ABRECHNUNGSKREIS = StringField(_d="z. B. Tischnummer", max_length=50)


class Bonkopf_Zahlarten(Model):
    """
    3.1.2.3  Datei: Bonkopf_Zahlarten
    Da es mehrere Zahlarten pro Bonkopf geben kann, sind diese in einer D-Tabeletaille
    aufgeführt. Zu beachten sind die später näher erläuterten Festlegungen zu den Zahlar-
    ten in Anhang D.
    """

    _filename = "datapayment.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    ZAHLART_TYP = StringField(_d="Typ der Zahlart", max_length=25)
    ZAHLART_NAME = StringField(_d="Name der Zahlart", max_length=60)
    ZAHLWAEH_CODE = StringField(_d="Währungscode", max_length=3, regex="^[A-Z]{3}$")
    ZAHLWAEH_BETRAG = NumericField(places=2, _d="Betrag in Fremdwährung")
    BASISWAEH_BETRAG = NumericField(places=2, _d="Betrag in Basiswährung (i.d.R. EUR)")
    KASSENSCHUBLADENNR = StringField(_d="Nummer der Kassenschublade", max_length=40)


class Bon_Referenzen(Model):
    """
    3.1.2.4  Datei: Bon_Referenzen
    In dieser Datei können Referenzen auf Vorgänge innerhalb der DSFinV-K ebenso wie
    Verweise auf externe Systeme vorgenommen werden. Welche Art der Referenzierung
    vorliegt, ergibt sich aus dem Typ der Referenzierung. Die einzelnen Felder sind imAn  -
    hang E in der Datei „Bon_Referenzen“ (references.csv) näher erläutert.
    """

    _filename = "references.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    POS_ZEILE = StringField(
        _d="Zeilennummer des referenzierenden Vorgangs (nicht bei Verweis aus einem Bonkopf heraus)"
    )
    REF_TYP = StringField(_d="Art der Referenz", max_length=20)
    REF_NAME = StringField(_d="Beschreibung bei Art “ExterneSonstige”", max_length=40)
    REF_DATUM = LocalDateTimeField(_d="Datum des Kassenabschlusses")
    REF_Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    REF_Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    REF_BON_ID = StringField(_d="Vorgangs-ID", max_length=40)


class TSE_Transaktionen(Model):
    """
    3.1.2.5  Datei: TSE_Transaktionen
    In dieser Datei sind die Daten der Transaktionen zu speichern. Insbesondere werden
    die Daten benötigt, um die abgesicherten Protokolldaten ohne TSE-Export verifizieren
    zu können sowie um die Gültigkeit der eingesetzten TSE-Zertifikate zum Zeitpunkt der
    Protokollierung prüfen zu können.
    """

    _filename = "transactions_tse.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    BON_ID = StringField(_d="Vorgangs-ID", max_length=40)
    TSE_ID = NumericField(places=0, _d="ID der für die Transaktion verwendeten TSE")
    TSE_TANR = NumericField(places=0, _d="Transaktionsnummer der Transaktion")
    TSE_TA_START = StringField(_d="Log-Time der StartTransaction-Operation")
    TSE_TA_ENDE = StringField(_d="Log-Time der FinishTransaction-Operation")
    TSE_TA_VORGANGSART = StringField(_d="processType der FinishTransaction-Operation", max_length=30)
    TSE_TA_SIGZ = NumericField(places=0, _d="Signaturzähler der FinishTransaction-Operation")
    TSE_TA_SIG = StringField(_d="Signatur der FinishTransaction-Operation", max_length=512)
    TSE_TA_FEHLER = StringField(_d="Ggf. Hinweise auf Fehler der TSE", max_length=200)
    TSE_TA_VORGANGSDATEN = StringField(_d="Daten des Vorgangs (optional)")


class Stamm_Abschluss(Model):
    """
    3.2.1  Datei: Stamm_Abschluss
    Daten des Kassenabschlusses, dazu gehören Datum, Uhrzeit und Star-t sowie End-ID.
    Ebenfalls werden die Unternehmensdaten inkl. Steuernum mberzw.  Umsatzsteuer-
    Identifikationsnummer hier gespeichert.
    """

    _filename = "cashpointclosing.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    Z_BUCHUNGSTAG = StringField(_d="Vom Erstellungsdatum abweichender Verbuchungstag")
    TAXONOMIE_VERSION = StringField(
        _d="Version der DFKA-Taxonomie-Kasse", max_length=10, regex="^[0-9]+(\\.[0-9]{1,2})?$", default=TAXONOMY_VERSION
    )
    Z_START_ID = StringField(_d="Erste BON_ID im Abschluss", max_length=40)
    Z_ENDE_ID = StringField(_d="Letzte BON_ID im Abschluss", max_length=40)
    NAME = StringField(_d="Name des Unternehmens", max_length=60)
    STRASSE = StringField(_d="Straße", max_length=60)
    PLZ = StringField(_d="Postleitzahl", max_length=10)
    ORT = StringField(_d="Ort", max_length=62)
    LAND = StringField(_d="Land", max_length=3)
    STNR = StringField(_d="Steuernummer des Unternehmens", max_length=20)
    USTID = StringField(_d="USTID", max_length=15)
    Z_SE_ZAHLUNGEN = NumericField(places=2, _d="Summe aller Zahlungen")
    Z_SE_BARZAHLUNGEN = NumericField(places=2, _d="Summe aller Barzahlungen")


class Stamm_Orte(Model):
    """
    3.2.2  Datei: Stamm_Orte
    Namen und Orte der einzelnen Betriebsstätten mit Kassen.
    """

    _filename = "location.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    LOC_NAME = StringField(_d="Name des Standortes", max_length=60)
    LOC_STRASSE = StringField(_d="Straße", max_length=60)
    LOC_PLZ = StringField(_d="Postleitzahl", max_length=10)
    LOC_ORT = StringField(_d="Ort", max_length=62)
    LOC_LAND = StringField(_d="Land", max_length=3)
    LOC_USTID = StringField(_d="USTID", max_length=15)


class Stamm_Kassen(Model):
    """
    3.2.3  Datei: Stamm_Kassen
    Stammdaten der einzelnen eingesetzten Kassen.
    """

    _filename = "cashregister.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    KASSE_BRAND = StringField(_d="Marke der Kasse", max_length=50)
    KASSE_MODELL = StringField(_d="Modellbezeichnung", max_length=50)
    KASSE_SERIENNR = StringField(_d="Seriennummer der Kasse", max_length=70)  # must not contain '/' or '_'
    KASSE_SW_BRAND = StringField(_d="Markenbezeichnung der Software", max_length=50)
    KASSE_SW_VERSION = StringField(_d="Version der Software", max_length=50)
    KASSE_BASISWAEH_CODE = StringField(_d="Basiswährung der Kasse", max_length=3, regex="[A-Z]{3}")
    KEINE_UST_ZUORDNUNG = BooleanField(_d="UmsatzsteuerNichtErmittelbar")


class Stamm_Terminals(Model):
    """
    3.2.4  Datei: Stamm_Terminals
    Stammdaten der einzelnen Erfassungs-Terminals (sog. Slave-Kassen), über die nicht
    der Kassenabschluss erfolgt.
    """

    _filename = "slaves.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    TERMINAL_ID = StringField(_d="ID des Terminals", max_length=50)
    TERMINAL_BRAND = StringField(_d="Marke der Terminals", max_length=50)
    TERMINAL_MODELL = StringField(_d="Modellbezeichnung des Terminals", max_length=50)
    TERMINAL_SERIENNR = StringField(_d="Seriennummer des Terminals", max_length=70)
    TERMINAL_SW_BRAND = StringField(_d="Markenbezeichnung der Software", max_length=50)
    TERMINAL_SW_VERSION = StringField(_d="Version der Software", max_length=50)


class Stamm_Agenturen(Model):
    """
    3.2.5  Datei: Stamm_Agenturen
    Werden Beträge „für Rechnung Dritter“ erfasst (durchlaufende Posten), ist der Dritte
    verantwortlich für die korrekte Erfassung der Umsatzsteuer (z B..  Shop-in-Shop, wobei
    es unabhängige Unternehmer sein müssen).
    Die durchlaufenden Posten müssen von den eigenen Kasseneinnahmen getrennt auf-
    gezeichnet werden. Aus diesem Grund erfolgt die Trennung in der DSFinVK- über eine
    Agentur-ID. Bei der Berechnung einer Umsatzsteuer-Zahllast können nun die Agentu-
    rumsätze ausgenommen werden. Somit ist die Nachvollziehbarkeit der Umsatzsteuer-
    Zahllast sowie die Ermittlung der korrekten Tages-Kasseneinnahmen möglich. Ebenso
    ist eine korrekte Bildung der zu verbuchenden Summen hinsichtlich der Agentur ge-
    währleistet.
    """

    _filename = "pa.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    AGENTUR_ID = NumericField(places=0, _d="ID der Agentur")
    AGENTUR_NAME = StringField(_d="Name des Auftraggebers", max_length=60)
    AGENTUR_STRASSE = StringField(_d="Straße", max_length=60)
    AGENTUR_PLZ = StringField(_d="Postleitzahl", max_length=10)
    AGENTUR_ORT = StringField(_d="Ort", max_length=62)
    AGENTUR_LAND = StringField(_d="Land", max_length=3)
    AGENTUR_STNR = StringField(_d="Steuernummer des Auftraggebers", max_length=20)
    AGENTUR_USTID = StringField(_d="USTID des Auftraggebers", max_length=15)


class Stamm_USt(Model):
    """
    3.2.6  Datei: Stamm_USt
    Stammdaten zur Umsatzsteuer (ID, USt-Satz, Beschreibung)
    """

    _filename = "vat.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    UST_SCHLUESSEL = NumericField(places=0, _d="ID des Umsatzsteuersatzes")
    UST_SATZ = NumericField(places=2, _d="Prozentsatz")
    UST_BESCHR = StringField(_d="Beschreibung", max_length=55)


class Stamm_TSE(Model):
    """
    3.2.7  Datei: Stamm_TSE
    Stammdaten der genutzten technischen Sicherheitseinrichtungen
    """

    _filename = "tse.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    TSE_ID = NumericField(
        places=0, _d="ID der TSE - wird nur zur Referenzierung innerhalb eines Kassenabschlusses verwendet"
    )
    TSE_SERIAL = StringField(
        _d="Seriennummer der TSE (Entspricht laut TR-03153 Abschnitt 7.5. dem Hashwert des im Zertifikat enthaltenen "
        "Schlüssels in Octet-String-Darstellung)",
        max_length=68,
    )
    TSE_SIG_ALGO = StringField(
        _d="Der von der TSE verwendete Signaturalgorithmus",
        max_length=30,
    )
    TSE_ZEITFORMAT = StringField(
        _d="Das von der TSE verwendete Format für die Log-Time - 'utcTime' = YYMMDDhhmmZ, 'utcTimeWithSeconds' = YYMMDDhhmmssZ, "
        "'generalizedTime' = YYYYMMDDhhmmssZ, 'generalizedTimeWithMilliseconds' = YYYYMMDDhhmmss.fffZ, 'unixTime'"
    )
    TSE_PD_ENCODING = StringField(
        _d="Text-Encoding der ProcessData (UTF-8 oder ASCII)", max_length=5, regex="^(UTF-8|ASCII)$"
    )
    TSE_PUBLIC_KEY = StringField(
        _d="Öffentlicher Schlüssel – ggf. extrahiert aus dem Zertifikat der TSE – in base64-Codierung", max_length=512
    )
    TSE_ZERTIFIKAT_I = StringField(
        _d="Erste 1.000 Zeichen des Zertifikats der TSE (in base64-Codierung)", max_length=1000
    )
    TSE_ZERTIFIKAT_II = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)
    TSE_ZERTIFIKAT_III = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)
    TSE_ZERTIFIKAT_IV = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)
    TSE_ZERTIFIKAT_V = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)
    TSE_ZERTIFIKAT_VI = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)
    TSE_ZERTIFIKAT_VII = StringField(_d="Ggf. Rest des Zertifikats (in base64-Codierung)", max_length=1000)


class Z_GV_Typ(Model):
    """
    3.3.1  Datei: Z_GV_Typ
    Für jeden Geschäftsvorfalltypen (G„ V_Typ“)  werden (getrennt nach G„ V_NAME“  als
    Summen) die weiter zu verarbeitenden Gesamtbeträge dargestellt.
    Die möglichen Geschäftsvorfalltypen sind in Anhang C dargestellt.
    """

    _filename = "businesscases.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    GV_TYP = StringField(_d="Typ der Geschäftsvorfall-Art", max_length=30)
    GV_NAME = StringField(_d="Name der Geschäftsvorfall-Art", max_length=40)
    AGENTUR_ID = NumericField(places=0, _d="ID der Agentur")
    UST_SCHLUESSEL = NumericField(places=0, _d="ID des Umsatzsteuersatzes")
    Z_UMS_BRUTTO = NumericField(places=2, _d="Bruttoumsatz")
    Z_UMS_NETTO = NumericField(places=2, _d="Nettoumsatz")
    Z_UST = NumericField(places=2, _d="USt")


class Z_Zahlart(Model):
    """
    3.3.2  Datei: Z_Zahlart
    Für jeden Zahlarttypen („ZAHLART_TYP“) werden (getrennt nach Z„AHLART_NAME“)
    Summen gebildet („ZAHLART_BETRAG)“, die weiter in der Buchhaltung zu verarbei-
    tenden Gesamtbeträge dargestellt.
    Die möglichen Zahlarten werden in Anhang D dargestellt.
    """

    _filename = "payment.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    ZAHLART_TYP = StringField(_d="Typ der Zahlart", max_length=25)
    ZAHLART_NAME = StringField(_d="Name der Zahlart", max_length=60)
    Z_ZAHLART_BETRAG = NumericField(places=2, _d="Betrag")


class Z_Waehrungen(Model):
    """
    3.3.3  Datei: Z_Waehrungen
    Für jede Währung („ZAHLART_WAEH“) wird die Summe in dieser Datei dargestellt.
    Damit stellt diese Datei eine jederzeitige Kassensturz-Fähigkeit her.
    """

    _filename = "cash_per_currency.csv"

    Z_KASSE_ID = StringField(_d="ID der (Abschluss-) Kasse", max_length=50)
    Z_ERSTELLUNG = LocalDateTimeField(_d="Zeitpunkt des Kassenabschlusses")
    Z_NR = NumericField(places=0, _d="Nr. des Kassenabschlusses")
    ZAHLART_WAEH = StringField(_d="Währung", max_length=3, regex="^[A-Z]{3}$")
    ZAHLART_BETRAG_WAEH = NumericField(places=2, _d="Betrag")
