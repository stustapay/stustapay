import { Container, Link } from "@mui/material";
import { Box } from "@mui/system";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const PrivacyPolicy = () => {
  useTranslation();

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ flexDirection: "column", alignItems: "center", width: "100%", textAlign: "justify" }}>
        <h2 id="datenschutz">Datenschutz</h2>
        <p>
          <Trans i18nKey="privacyPolicyHeader">
            link to
            <Link component={RouterLink} to="/agb">
              terms and conditions
            </Link>
            .
          </Trans>
        </p>
        <h3 id="verantwortlicher-im-sinne-der-dsgvo">VERANTWORTLICHER IM SINNE DER DSGVO</h3>
        <p>
          Wir legen sehr viel Wert auf den Schutz Ihrer persönlichen Daten und erheben auf dieser Webseite sowie im
          Rahmen unseres bargeldlosen Bezahlsystems personenbezogene Daten nur im technisch notwendigen Umfang für
          interne, statistische Zwecke und Auswertungen.
        </p>
        <p>
          Mit der folgenden Datenschutzerklärung möchten wir Sie darüber aufklären, welche Arten Ihrer personenbezogenen
          Daten (nachfolgend auch kurz als “Daten“ bezeichnet) wir zu welchen Zwecken und in welchem Umfang verarbeiten.
          Die Datenschutzerklärung gilt für alle von uns durchgeführten Verarbeitungen personenbezogener Daten, sowohl
          im Rahmen der Erbringung unserer Leistungen als auch insbesondere auf unseren Webseiten, in mobilen
          Applikationen sowie innerhalb externer Onlinepräsenzen, wie z. B. unserer Social-Media-Profile (nachfolgend
          zusammenfassend bezeichnet als”Onlineangebot“).
        </p>
        <p>Die verwendeten Begriffe sind nicht geschlechtsspezifisch.</p>
        <h3 id="datenerhebung-und--protokollierung">DATENERHEBUNG UND -PROTOKOLLIERUNG</h3>
        <p>
          Eine Erhebung, Verarbeitung und Nutzung der personenbezogenen Daten erfolgt immer nur zu dem jeweils
          angegebenen Zweck. Wir nutzen diese Daten für statistische Zwecke ausschliesslich für den internen Gebrauch.
          Die Daten werden nicht dazu benutzt, den Besucher unserer Webseiten persönlich zu identifizieren. Wir geben
          diese Daten auch nicht an Dritte weiter. Die Daten werden nach erreichen des Zwecks der Speicherung gelöscht.
        </p>
        <p>
          Im Regelfall können Sie unsere Internetseiten ohne Angaben zu Ihrer Person nutzen. Im Einzelfall, zum Beispiel
          bei Kontaktformularen, benötigen wir Ihren Namen, Anschrift, EMail-Adresse oder weitere Angaben, die Sie dann
          im jeweiligen Formular selbst angeben und an uns übermitteln.
        </p>
        <p>
          Bedenken Sie, dass die Datenübertragung im Internet grundsätzlich Sicherheitslücken aufweisen kann. Ein
          vollumfänglicher Schutz vor dem Zugriff durch Fremde kann daher nicht gewährleistet werden.
        </p>
        <p>
          Jeder Zugriff auf die Website und jeder Abruf von Dateien wird in einem Logfile gespeichert. Diese
          Zugriffsdaten verwenden wir, um die Stabilität und Sicherheit unseres Systems zu gewährleisten und gegen
          mögliche Angriffe von aussen abzusichern. Eine Zusammenführung dieser Daten mit anderen Datenquellen findet
          nicht statt.
        </p>
        <p>
          Folgende Daten werden dabei erhoben: – Datum und Uhrzeit des Abrufs – Pfad der abgerufenen Datei oder Seite –
          Die übertragene Datenmenge – IP-Adresse (Kennung für internetfähige Geräte) – Referrer (unmittelbar vorher
          besuchte Internetseite) – Browserkennung (Browsername inkl. Version) – Das vom zugreifenden System verwendete
          Betriebssystem
        </p>
        <h3 id="cookies">COOKIES</h3>
        <p>
          Cookies verwenden wir nur um die Nutzung bestimmer Funktionen zu ermöglichen und den Komfort des
          Internetauftrittes zu erhöhen. Cookies werden von uns auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
          gespeichert. Cookies sind kleine Textdateien, die lokal auf Ihrem Rechner gespeichert werden. Sie sind nicht
          gefährlich, enthalten keinen Schadcode, sie beinhalten nur Informationen zu Ihrem Besuch und der Benutzung
          unserer Seiten. Die Nutzung von Cookies beschränken wir auf das technisch nötige Minimum. Sie können diese
          Cookies in Ihren Browsereinstellungen jederzeit löschen oder generell deaktivieren. Das kann allerdings zur
          Folge haben, daß einzelne Dienste auf unseren Seiten nicht mehr einwandfrei funktionieren.
        </p>
        <h3 id="rechte-des-nutzers">RECHTE DES NUTZERS</h3>
        <p>
          Sie als Nutzer erhalten auf Antrag Ihrerseits kostenlose Auskunft darüber, welche personenbezogenen Daten über
          Sie gespeichert wurden. Sofern Ihr Wunsch nicht mit einer gesetzlichen Pflicht zur Aufbewahrung von Daten (z.
          B. Vorratsdatenspeicherung) kollidiert, haben Sie ein Anrecht auf Berichtigung falscher Daten und auf die
          Sperrung oder Löschung Ihrer personenbezogenen Daten. Viele Daten können nur mit Ihrer Einwilligung
          verarbeitet werden. Sie haben das Recht, diese Einwilligung jederzeit zu wiederrufen. Dazu reicht eine
          formlose E-Mail an uns.
        </p>
        <p>
          Bei datenschutzrechtlichen Verstößen haben sie auch das Recht, bei der zuständigen Aufsichtsbehörde Beschwerde
          einzureichen.
        </p>
        <p>
          Recht auf Auskunft (DSGVO, Art. 15) Recht auf Berichtigung (DSGVO, Art. 16) Recht auf Löschung (Recht auf
          Vergessenwerden) (DSGVO, Art. 17) Recht auf Einschränkung der Verarbeitung (DSGVO, Art. 18) Recht auf
          Datenübertragung (DSGVO, Art.20) Recht auf Wiederspruch (DSGVO, Art.21) Recht auf Beschwerde (DSGVO, Art.77)
        </p>
        <h3 id="verpflichtung-zur-bereitstellung-personenbezogener-daten-seitens-des-betroffenen-und-die-möglichen-folgen-der-nichtbereitstellung">
          Verpflichtung zur Bereitstellung personenbezogener Daten seitens des Betroffenen und die möglichen Folgen der
          Nichtbereitstellung
        </h3>
        <p>
          Ohne den Kauf und den Einsatz eines Festivalbändchens mit integriertem Chip ist eine Teilnahme am bargeldlosen
          Zahlungssystem nicht möglich. Ohne die Angaben von Daten kann die Rücküberweisung von Restguthaben nicht
          durchgeführt werden.
        </p>
        <h3 id="beschreibung-der-erhobenen-daten">Beschreibung der erhobenen Daten</h3>
        <h4 id="definition-der-betroffenen">Definition der Betroffenen</h4>
        <p>Teilnehmer des bargeldlosen Zahlungssystems</p>
        <h4 id="erhobene-verarbeitete-daten">Erhobene / Verarbeitete Daten</h4>
        <p>
          Chipdaten (Chip-Nummer, Verbrauchergruppe), Artikeldaten, Kassendaten (Uhrzeit, Ort, Kassennummer), im Fall
          von Beschwerden Name, Vorname und Kontaktdaten und Betrag, ggf. Korrespondenz
        </p>
        <h4 id="rechtsgrundlage-der-verarbeitung">Rechtsgrundlage der Verarbeitung</h4>
        <p>Art. 6 (1) b DS-GVO: Kaufvertrag</p>
        <h4 id="speicherdauer-oder-kriterien-für-die-festlegung-der-speicherdauer">
          Speicherdauer oder Kriterien für die Festlegung der Speicherdauer
        </h4>
        <p>10 Jahre</p>
        <h4 id="empfänger-oder-kategorien-von-empfängern">Empfänger oder Kategorien von Empfängern</h4>
        <p>Keine</p>
        <h3 id="beschreibung-der-erhobenen-daten-1">Beschreibung der erhobenen Daten</h3>
        <h4 id="definition-der-betroffenen-1">Definition der Betroffenen</h4>
        <p>Teilnehmer an der Rücküberweisung</p>
        <h4 id="erhobene-verarbeitete-daten-1">Erhobene / Verarbeitete Daten</h4>
        <p>Daten im Rahmen der Aufladung (UID Nummer, Bankverbindung), ggf. Korrespondenz</p>
        <h4 id="rechtsgrundlage-der-verarbeitung-1">Rechtsgrundlage der Verarbeitung</h4>
        <p>Art. 6 (1) b DS-GVO: Kaufvertrag</p>
        <h4 id="speicherdauer-oder-kriterien-für-die-festlegung-der-speicherdauer-1">
          Speicherdauer oder Kriterien für die Festlegung der Speicherdauer
        </h4>
        <p>10 Jahre</p>
        <h4 id="empfänger-oder-kategorien-von-empfängern-1">Empfänger oder Kategorien von Empfängern</h4>
        <p>Banken (Bankverbindung, Verwendungszweck)</p>
        <h3 id="beschreibung-der-erhobenen-daten-2">Beschreibung der erhobenen Daten</h3>
        <h4 id="definition-der-betroffenen-2">Definition der Betroffenen</h4>
        <p>Teilnehmer an der Aufladung mit EC- oder Kreditkarte. Teilnehmer an der Bargeld-Aufladung</p>
        <h4 id="erhobene-verarbeitete-daten-2">Erhobene / Verarbeitete Daten</h4>
        <p>Daten im Rahmen der Aufladung (UID Nummer, Betrag der Aufbuchung, Bankverbindung), ggf. Korrespondenz</p>
        <h4 id="rechtsgrundlage-der-verarbeitung-2">Rechtsgrundlage der Verarbeitung</h4>
        <p>Art. 6 (1) b DS-GVO: Kaufvertrag</p>
        <h4 id="speicherdauer-oder-kriterien-für-die-festlegung-der-speicherdauer-2">
          Speicherdauer oder Kriterien für die Festlegung der Speicherdauer
        </h4>
        <p>10 Jahre</p>
        <h4 id="empfänger-oder-kategorien-von-empfängern-2">Empfänger oder Kategorien von Empfängern</h4>
        <p>Banken</p>
        <h3 id="absicht-die-personenbezogenen-daten-in-ein-nicht-eu-ausland-zu-übermitteln">
          Absicht die personenbezogenen Daten in ein Nicht-EU-Ausland zu übermitteln
        </h3>
        <p>Findet nicht statt.</p>
      </Box>
    </Container>
  );
};
