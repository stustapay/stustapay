import { Container, Link } from "@mui/material";
import { Box } from "@mui/system";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const Agb = () => {
  useTranslation();

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ flexDirection: "column", alignItems: "center", width: "100%", textAlign: "justify" }}>
        <h1 id="stustapay-agb">StuStaPay AGB</h1>
        <p>
          <Trans i18nKey="termsAndConditionsHeader">
            Link to
            <Link component={RouterLink} to="/datenschutz">
              privacy policy
            </Link>
            .
          </Trans>
        </p>
        <h2 id="cashless-payment">Cashless Payment</h2>
        <p>
          Der Veranstalter behält sich vor, ein bargeldloses Bezahlsystem zum kontaktlosen elektronischen Bezahlen in
          Teilen oder ganzheitlich zu verwenden. Art und Umfang werden alleine vom Veranstalter bestimmt, es besteht
          kein Anspruch auf bestimmte Bezahlverfahren. Der Veranstalter behält sich vor, das Bezahlsystem auch während
          des Festivals zu ändern. Eine Auszahlung des eingezahlten Guthabens ist möglich, kann aber nicht garantiert
          werden.
        </p>
        <p>Die detailierten Geschäftsbedingungen werden fürs konkrete System ausgewiesen.</p>
        <p>
          Das StuStaCulum verwendet ein bargeldloses Bezahlsystem (im weiteren “StuStaPay”) in Form eines Armbandes
          mittels NFC Chip. Der Vertrieb erfolgt im Namen und für Rechnung des Verein Kulturleben in der Studentenstadt
          e.V. (im weiteren „VERANSTALTER“). Für die Nutzung des elektronischen Zahlungsmittels gelten im Verhältnis
          zwischen dem Verein Kulturleben in der Studentenstadt e.V. und dem jeweiligen Chipinhaber die nachfolgenden
          Allgemeinen Geschäftsbedingungen.
        </p>
        <h3 id="begriffsbestimmungen">Begriffsbestimmungen:</h3>
        <h4 id="chip">CHIP</h4>
        <p>
          NFC Karten bzw. Armbänder (= „Chip“) werden vom Veranstalter zur Verfügung gestellt, um einen bargeldlosen
          Zahlungsvorgang mittels NFC Technologie zu ermöglichen. Die zur Verfügung gestellten Karten bzw. Armbänder
          kommen grundsätzlich jeweils nur bei der konkreten Veranstaltung zum Einsatz. Sollte es sich um eine
          Dauerveranstaltung bzw. Projekt handeln, kann die Karte (bzw. das Armband) auch längerfristig zum Einsatz
          kommen, sowie beladen und entladen werden.
        </p>
        <h4 id="top-up">TOP-UP</h4>
        <p>
          Als „top-up“ wird der Vorgang bezeichnet, wodurch Geld (mittels Bargeld, EC-, Kreditkarte, o.ä.) auf den Chip
          des Kunden geladen wird.
        </p>
        <h4 id="top-up-station">TOP-UP Station</h4>
        <p>
          Als „top-up Station“ wird die Vorrichtung bzw. die Station bezeichnet, welche zur Aufladung vor Ort beim
          Projekt dient. Es kann sich um eine betreute Aufladestation (Personal vor Ort) oder um eine
          Self-Service-Station handeln.
        </p>
        <h4 id="online-top-up">ONLINE TOP-UP</h4>
        <p>
          Online top-up bezeichnet die Möglichkeit, online via bereitgestellter Plattform (Eventportal) Geld auf den
          Chip zu laden. Dieser Vorgang kann - sofern eingerichtet - beliebig oft durchgeführt werden. Die Entscheidung
          ob bzw. welche jeweiligen Optionen eröffnet sind, behält sich der Veranstalter vor. Sollten Produkte online
          erworben werden (egal ob Guthaben oder faktische Produkte wie Getränke oder Merchandise Produkte), kann binnen
          14 Tagen vom Vertrag zurückgetreten werden ab Erhalt der Ware.
        </p>
        <h4 id="payout">PAYOUT</h4>
        <p>
          Als Payout wird der Vorgang bezeichnet, mittels welchem das auf die Karte bzw. Band gebuchte (Rest-)Guthaben
          wieder vom Kunden nach dem Projekt zurückgefordert werden kann.
        </p>
        <h4 id="beleg">BELEG</h4>
        <p>
          Ein Beleg im Sinn dieser Richtlinie entspricht den in Deutschland geltenden Bestimmungen zur Registrierkassen-
          und Belegerteilungspflicht. Ein Beleg wird zu jedem Verkaufsvorgang erstellt und im Eventportal zum Download
          zur Verfügung gestellt.
        </p>
        <h4 id="uid-nummer-und-sicherheitsnummer">UID NUMMER UND SICHERHEITSNUMMER</h4>
        <p>
          UID Nummer im Sinn dieser Richtlinie ist die 14-stellige Nummer, welche auf der Rückseite des Chips bzw. der
          Karte aufgedruckt ist. Die Sicherheitsnummer im Sinn dieser Richtlinie ist die 6-stellige Nummer, welche auf
          der Rückseite des Chips bzw. der Karte aufgedruckt ist. Beide Nummern werden zum Login im Eventportal
          benötigt, welches Nachverfolgung der Konsumation, Online-Aufladung sowie Auszahlung des Restguthabens
          (=Payout) ermöglicht.
        </p>
        <h4 id="gutscheine">GUTSCHEINE</h4>
        <p>
          Vom Veranstalter kann Geld in Form von Gutscheinen auf den Chip geladen werden. Dieses Guthaben („Gift
          Guthaben“) kann beim Payout nicht ausbezahlt werden. Weiters kann es somit auch nicht auf andere Chips
          übertragen werden. Dieses „geschenkte“ Guthaben kann vom Veranstalter frei vergeben werden, weshalb auf dessen
          Erteilung grundsätzlich kein expliziter Anspruch besteht.
        </p>
        <h4 id="eventportal">EVENTPORTAL</h4>
        <p>
          Die Seite pay.stustaculum.de wird vom Verein Kulturleben in der Studentenstadt e.V. betrieben. Im Eventportal
          ist es möglich, den jeweiligen Chip hinzuzufügen, Transaktionen und Belege abzurufen, den Chip während des
          Events zu beladen und gegebenenfalls nach der Veranstaltung einen Payout zu beantragen.
        </p>
        <h4 id="kundebesucher">KUNDE/BESUCHER</h4>
        <p>
          Als „Kunde“ bzw. „Besucher“ gelten jegliche Besucher bzw. Kunden des jeweiligen Veranstalters bzw. des
          Betriebes, wo StuStaPay zum Einsatz kommt.
        </p>
        <h3 id="vertragsbeziehungen">Vertragsbeziehungen</h3>
        <ol type="1">
          <li>
            Mit dem Bezug bzw. Aufladen des Chips kommt ein Vertrag zwischen dem VERANSTALTER und dem Chipinhaber über
            die Nutzung des Chips als Zahlungssystem gemäß den nachfolgenden Bedingungen zustande.
          </li>
          <li>
            Der Eintrittskartenverkauf, sowie Konsumation bei Ständen ohne StuStaPay während der Veranstalung sind
            Gegenstand gesonderter Vertragsverhältnisse mit dem VERANSTALTER oder Standbetreiber, für die gesonderte
            Allgemeine Geschäftsbedingungen (AGBs) gelten.
          </li>
          <li>
            Der VERANSTALTER ist berechtigt, sich im Rahmen des Vertragsverhältnisses zur Bewirkung der vom VERANSTALTER
            zu erbringenden Leistung Dritter zu bedienen.
          </li>
          <li>
            Der Chip wird unpersonalisiert ausgestellt, kann vom Chipinhaber jedoch im „Eventportal“ unter Angabe von
            Name und E-Mail Adresse des Chipinhabers, sowie der UID und Sicherheitsnummer des Chips registriert werden,
            um Guthaben aufzuladen bzw. einen Online-Payout zu beantragen.
          </li>
          <li>
            Der Chip darf nicht zu gesetzeswidrigen Zwecken genutzt werden. Das Armband darf nicht weitergegeben werden.
          </li>
          <li>
            Nimmt der Chipinhaber Leistungen von Partnerunternehmen des VERANSTALTERs in Anspruch, die ebenfalls mit
            StuStaPay bezahlt werden können, so begründen diese ein gesondertes Vertragsverhältnis zwischen dem
            Chipinhaber und dem Partnerunternehmen.
          </li>
        </ol>
        <h3 id="leistungsumfang">Leistungsumfang</h3>
        <ol type="1">
          <li>
            Mit dem Armband kann der Chipinhaber an den für die Nutzung des Chips freigegebenen Veranstaltungstagen
            innerhalb der Einsatzstätten Leistungen der angeschlossenen Akzeptanzstellen bargeldlos bezahlen. Bei jedem
            Zahlungsvorgang vermindert sich das auf dem Chip gespeicherte Guthaben um den verfügten Betrag. Nach
            Durchführung des Zahlungsvorgangs ist ein Widerruf der Zahlung ausgeschlossen.
          </li>
          <li>
            Der VERANSTALTER schuldet nicht die Erbringung der von angeschlossenen Akzeptanzstellen angebotenen
            Leistungen, wenn diese von Partnerunternehmen des VERANSTALTERs betrieben werden.
          </li>
        </ol>
        <h3 id="erwerb">Erwerb</h3>
        <ol type="1">
          <li>
            Das Armband mit Chip ist beim VERANSTALTER an den ausgewiesenen Stellen innerhalb der Einsatzstätte
            erhältlich. Der Chipinhaber erwirbt kein Eigentum an dem Chip. Der Chip berechtigt lediglich zur Verfügung
            über das Guthaben.
          </li>
          <li>
            Der Chip hat grundsätzlich einen Mindestausgabewert von 0,00 €. Eine Änderung des Mindestausgabewertes ist
            einseitig durch den VERANSTALTER jederzeit möglich.
          </li>
        </ol>
        <h3 id="top-up-aufladung">Top-Up (Aufladung)</h3>
        <ol type="1">
          <li>
            Der Chip wird mit oder ohne Startguthaben ausgegeben. Er ist jederzeit (wieder-)aufladbar und kann während
            der Öffnungszeiten an den hierfür ausgewiesenen Stellen innerhalb der Einsatzstätte (Top-up Station) per
            Bargeld, EC-Karte, Kreditkarte (Visa Card, Master Card) oder anderen vom VERANSTALTER zugelassenen
            Zahlungsmethoden aufgeladen werden. Der Chipinhaber kann seinen Chip nur im Rahmen von vorhandenem
            Chipguthaben nutzen.
          </li>
          <li>
            Sofern der Top-Up mittels Kreditkarte erfolgt, gewährleistet der Kunde bei jedem Top-Up eine problemlose
            Belastung der Kreditkarte - und somit die Deckung seines Kontos. Sollte eine korrekte Belastung nicht
            möglich sein, behält sich der VERANSTALTER das Recht vor, das Geld anderweitig einzufordern. Der Kunde
            erklärt sich damit einverstanden, zuerst den Bezahlvorgang vollständig abzuschließen und dafür im Anschluss
            das gekaufte Produkt, die Dienstleistung oder Sonstiges zu erwerben.
          </li>
          <li>
            Sofern bei der Veranstaltung ausschließlich bargeldlos bezahlt wird, darf durch den Kunden nicht versucht
            werden, zu kaufende Produkte oder Dienstleistungen etc. mittels Bargeld zu erwerben.
          </li>
          <li>
            Online top-up: Sollte nach dem erfolgten Online top-up keine aufrechte Internetverbindung bestehen und der
            Chip des Besuchers (Empfängerarmband bzw. Karte) das aufgeladene Guthaben nicht sofort nutzen können,
            kümmert sich der Kunde vor Ende der Veranstaltung selbst um die Rückerstattung der vorgenommenen Aufladung.
            Für vorübergehende fehlende Internetverbindung und daraus resultierende, vorübergehende, nicht zur Verfügung
            stehende Aufladungen ist der VERANSTALTER nicht haftbar zu machen.
          </li>
          <li>
            Der Kunde hat keinen expliziten Anspruch, dass seine Karte/Armband mit Geld be- oder entladen wird.
            Grundsätzlich kann jedoch - während der jeweiligen Öffnungszeiten - bei der Veranstaltung bei den jeweiligen
            Stationen Geld auf die Karte/Armband aufgebucht werden. Eine Entladung (Payout) vor Ort bei der
            Veranstaltung ist nur möglich, falls der VERANSTALTER diese Option anbietet. Grundsätzlich kann weiters bei
            jeder Top-Up Station und jedem Mitarbeiter, der ein Cashless-Gerät innerhalb der Einsatzstätte verwendet,
            das zu diesem Zeitpunkt auf der Karte/Armband vorhandene Guthaben abgefragt werden. Der Besucher hat jedoch
            keinen konkreten Anspruch, dieses zu einer bestimmten Zeit abzufragen.
          </li>
          <li>Der Mindestaufladebetrag beträgt 1,00€, der Höchstbetrag des Chipguthabens 150,00€.</li>
          <li>Die Guthabenbeträge sind Privatvermögen und werden nicht verzinst.</li>
        </ol>
        <h3 id="belege">Belege</h3>
        <ol type="1">
          <li>
            Alle Belege können im Eventportal (pay.stustaculum.de) online via Eingabe der UID Nummer und entsprechender
            Sicherheitsnummer abgerufen werden. Ist der Beleg durch verbindungstechnische Schwierigkeiten nicht sofort
            nach der Buchung online abrufbar, ist der VERANSTALTER nicht haftbar zu machen, sofern der Beleg bei
            funktionierender Internetverbindung zur Verfügung steht. Diese Zeitverzögerung muss jeweils verhältnismäßig
            sein.
          </li>
          <li>
            Sollte der Link zum Eventportal aus einem Grund nicht zugänglich sein, verpflichtet sich der VERANSTALTER in
            angemessener Zeit diesen Link wieder zugänglich zu machen. Mängel wie Unleserlichkeit, Rechtschreibfehler,
            Internet- oder Systemausfall, oder höhere Gewalt berechtigen jedoch auch in diesem Fall keine
            Regressforderungen.
          </li>
          <li>
            Der VERANSTALTER behält sich in diesem Fall das Recht vor, vor Ort Möglichkeiten zum Ausdrucken der Belege
            bereitzustellen.
          </li>
        </ol>
        <h3 id="kartenpfand">Kartenpfand</h3>
        <ol type="1">
          <li>Das Kartenpfand beträgt 0,- Euro.</li>
          <li>
            Der VERANSTALTER behält sich das Recht vor, Kartenpfand zu verlangen. Sofern ein Kartenpfand vorgesehen ist,
            wird der Betrag des Kartenpfandes bei dem ersten Top-Up auf der Karte/dem Armband gesperrt und erst bei
            Rückgabe der Karte/des Armbandes vor Ort beim Projekt wieder freigegeben. Eine andere Möglichkeit der
            Abwicklung von Becherpfand, ist die jeweilig entsprechende Verrechnung des Becherpfandes zuzüglich zum
            Getränk (Bsp: Verrechnung von gesamt €3,00 wobei €2,00 Getränkekosten und €1,00 Becherpfand ist). Der Betrag
            wird bei Rückgabe eines Bechers rückerstattet, wodurch folglich zwei separate Buchungen entstehen. In einem
            Vorgang können auch mehrere Becher zurückgegeben werden, was jedoch die jeweilige Verfügungsbefugnis des
            Becherpfands entsprechend voraussetzt.
          </li>
          <li>
            „Gewerbliches Bechersammeln“ ist bei jeglicher Veranstaltung untersagt, weshalb zugestimmt wird, dass ein
            entsprechend hoher Betrag, der aufgrund unzulässiger Becherrückgaben vor Ort am Chip entstanden ist, dieses
            Guthaben vom Kunden nicht zur Auszahlung (siehe PAYOUT) gelangen kann.
          </li>
        </ol>
        <h3 id="bedienfehler">Bedienfehler</h3>
        <ol type="1">
          <li>
            Der VERANSTALTER haftet nicht für beim Auf- oder Abbuchen erfolgte Bedienfehler, was auch für jegliche
            Gehilfen zu gelten hat. Diesbezüglich können sich die Besucher jeweils vor Ort an die zuständige Person
            wenden bzw. den VERANSTALTER kontaktieren. Sollten dem Besucher durch erfolgte Bedienfehler Geldvorteile
            erwachsen, ist er nicht dazu autorisiert, dieses Geld auszugeben, sondern hat sich unverzüglich an einen
            ausgewiesenen Helpdesk des VERANSTALTERs zu wenden.
          </li>
        </ol>
        <h3 id="gültigkeitsdauer">Gültigkeitsdauer</h3>
        <ol type="1">
          <li>
            Der Chip kann ab Erhalt für den ausgewiesenen Gültigkeitszeitraum für die Bezahlung bei den angeschlossenen
            Akzeptanzstellen verwendet werden. Etwaiges Restguthaben verfällt nach dem 30.09.2023.
          </li>
        </ol>
        <h3 id="payout-rückzahlung-von-guthaben">Payout (Rückzahlung von Guthaben)</h3>
        <ol type="1">
          <li>
            Der Chipinhaber hat keinen Anspruch auf die Auszahlung von Chipguthaben. Jegliche Optionen zur Rückzahlung
            von Chipguthaben stellen ein unverbindliches Angebot seitens des VERANSTALTERs dar. Der VERANSTALTER behält
            sich vor, den Payout-Vorgang je nach Veranstaltung festzulegen und kurzfristig abzuändern.
          </li>
          <li>
            Der VERANSTALTER behält sich vor, eine Auszahlung von etwaigem Chipguthaben zum Nennwert über das
            Eventportal in Form einer Überweisung auf ein Konto anzubieten. Im Falle der Überweisung kann das
            Chipguthaben mit angemessenen Transaktionskosten oder Bearbeitungs-/Servicegebühren belastet werden. Der
            Überweisungszeitraum kann je nach Land mehrere Tage bis Wochen dauern. Sollte der Payout-Vorgang online
            angeboten werden, kann dieser nur innerhalb der vom VERANSTALTER jeweils vorgegebenen Frist vorgenommen
            werden. Nach Fristablauf ist grundsätzlich kein Payout mehr über die Online-Plattform (Eventportal) möglich.
            Der VERANSTALTER übernimmt keine Haftung, sollte es durch falsches oder unvollständiges Ausfüllen des
            Onlineformulars bezüglich Payout zu keiner Rückerstattung des Geldguthabens kommen.
          </li>
          <li>
            Der VERANSTALTER behält sich vor, eine Barauszahlung von etwaigem Chipguthaben zum Nennwert vor Ort
            anzubieten. Der VERANSTALTER behält sich das Recht vor, bei Payout vor Ort eine Bearbeitungsgebühr bzw.
            Servicegebühr einzubehalten.
          </li>
          <li>
            Im Falle einer Beschädigung des Speicherchips bzw. der aufgebrachten eindeutigen UID des Chips durch
            unsachgemäßen Gebrauch (z.B. Lochen des Chips, Chipbruch) ist eine Rückzahlung des Restguthabens
            ausgeschlossen, außer der Chipinhaber weist ein noch bestehendes Chipguthaben nach.
          </li>
          <li>Gutscheine können nicht erstattet werden und verfallen automatisch nach jeder Veranstaltung.</li>
        </ol>
        <h3 id="reklamationen-und-geltendmachung-von-einwänden">Reklamationen und Geltendmachung von Einwänden</h3>
        <ol type="1">
          <li>
            Reklamationen, die das Vertragsverhältnis zwischen Chipinhaber und den Partnerunternehmen betreffen, sind
            unmittelbar zwischen diesen zu klären. Sie berühren nicht die Belastung des Chipguthabens mit dem verfügten
            Betrag.
          </li>
          <li>
            Etwaige Reklamationen hinsichtlich des Armbands können an die hierfür ausgewiesenen Stellen innerhalb der
            Einsatzstätte oder an den VERANSTALTER gerichtet werden.
          </li>
          <li>
            Der Chipinhaber hat bei jeder Transaktion die Höhe des Chipguthabens am Display des Zahlungsgerätes zu
            kontrollieren und gegebenenfalls sofort zu reklamieren.
          </li>
          <li>
            Sollte dem Chipinhaber nachweislich Geldvorteile durch erfolgte Bedienfehler erwachsen, ist dieser
            berechtigt, dieses Geld auszugeben. Der VERANSTALTER behält sich vor, diese Fehler, sobald sie offenkundig
            werden, entsprechend zu korrigieren.
          </li>
        </ol>
        <h3 id="sorgfaltsanforderungen-verlust-und-missbrauch">Sorgfaltsanforderungen, Verlust und Missbrauch</h3>
        <ol type="1">
          <li>
            Der Chipinhaber hat die Cashless-Karte/Armband mit besonderer Sorgfalt, ggf. in einer gesonderten
            Datenschutzhülle, aufzubewahren, um sie vor missbräuchlicher Verwendung zu schützen.
          </li>
          <li>
            Das Risiko eines Verlustes und eines vom Chipinhaber zu vertretenden Missbrauchs der Cashless-Karte/Armband
            trägt der Chipinhaber. Akzeptanz- und Rückzahlungsstellen prüfen nicht, ob der Chipinhaber rechtmäßiger
            Besitzer der Cashless-Karte/Armband ist.
          </li>
          <li>Der Armbandinhaber kann das personalisierte Armband sperren lassen.</li>
          <li>
            Stellt der Chipinhaber eines personalisierten Armbands den Verlust oder Diebstahl selbigen, die
            missbräuchliche Verwendung oder eine sonstige nicht autorisierte Nutzung der des Armbands oder der
            Kartendaten fest, hat er sich unverzüglich im Infozelt oder beim StuStaPay service zu melden (Sperranzeige).
            Dabei hat der Chipinhaber die UID Nummer anzugeben.
          </li>
          <li>Der Chipinhaber hat jeden Diebstahl oder Missbrauch unverzüglich bei der Polizei anzuzeigen.</li>
          <li>
            Bei Verdacht auf Vorliegen strafrechtlich relevanter Tatbestände erfolgt eine Strafanzeige durch
            VERANSTALTER. Die Geltendmachung zivilrechtlicher Ansprüche durch VERANSTALTER bleibt vorbehalten.
          </li>
        </ol>
        <h3 id="haftung">Haftung</h3>
        <ol type="1">
          <li>Der VERANSTALTER übernimmt keine Haftung für Verlust und Diebstahl von Cashless-Karten/Armbändern.</li>
          <li>
            Verliert der Chipinhaber seinen personalisierten Chip, wird dieser ihm gestohlen oder kommt er ihm in
            sonstiger Weise abhanden und kommt es dadurch zu einer nicht autorisierten Chipverfügung, so haftet der
            Chipinhaber für Schäden, die bis zum Zeitpunkt der Sperranzeige verursacht werden, in Höhe seines Guthabens
            auf der Cashless-Karte/Armband, ohne dass es darauf ankommt, ob den Chipinhaber an dem Verlust oder
            Diebstahl ein Verschulden trifft.
          </li>
          <li>
            Der Chipinhaber haftet nicht für Schäden nach Absatz (3), wenn er die Sperranzeige nicht abgeben konnte,
            weil der VERANSTALTER nicht die Möglichkeit zur Entgegennahme der Sperranzeige sichergestellt hatte und der
            Schaden nachweislich dadurch eingetreten ist.
          </li>
          <li>
            Verliert der Chipinhaber seine unpersonalisierte Cashless-Karte/Armband, wird sie ihm gestohlen oder kommt
            sie ihm in sonstiger Weise abhanden und kommt es dadurch zu einer nicht autorisierten Chipverfügung, so
            haftet der Chipinhaber für Schäden in Höhe seines Guthabens auf der Cashless-Karte/Armband, ohne dass es
            darauf ankommt, ob den Chipinhaber an dem Verlust oder Diebstahl ein Verschulden trifft.
          </li>
          <li>
            Hat der VERANSTALTER durch eine grob fahrlässige oder vorsätzliche Verletzung seiner Pflichten zur
            Entstehung des Schadens beigetragen, haftet der VERANSTALTER für den entstandenen Schaden im Umfang des von
            VERANSTALTER zu vertretenden Mitverschuldens.
          </li>
          <li>
            Sobald dem VERANSTALTER der Verlust oder Diebstahl der Cashless-Karte/Armband, die missbräuchliche
            Verwendung oder eine sonstige nicht autorisierte Nutzung der Cashless-Karte/Armband im Sinne dieser AGBs
            (Punkt 9, Abs. 4) angezeigt wurde, übernimmt der VERANSTALTER alle danach durch Chipverfügung entstehenden
            Schäden. Die Haftung des VERANSTALTERs ist auf die Höhe des Chipguthabens beschränkt. Handelt der
            Chipinhaber in betrügerischer Absicht, trägt der Chipinhaber auch die nach der Sperranzeige entstehenden
            Schäden.
          </li>
        </ol>
        <h3 id="datennutzung-datenschutz-geheimhaltung">Datennutzung, Datenschutz, Geheimhaltung</h3>
        <ol type="1">
          <li>
            Der Chipinhaber erklärt sich ausdrücklich damit einverstanden, dass seine persönlichen Daten durch den
            VERANSTALTER im Zuge der Vertragsbeziehung verarbeitet gespeichert werden. Zu diesem Zweck kann der
            Chipinhaber über die erhobenen Daten kontaktiert werden.
          </li>
          <li>
            Kunden ist es ausdrücklich verboten, StuStaPay zu kopieren, nachzumachen oder anderweitig missbräuchlich zu
            verwenden. Sollten einem Kunden Betriebsgeheimnisse, wenn auch nur zufällig bekannt werden, ist er dazu
            verpflichtet, diese als solche zu wahren und Dritten nicht zugänglich zu machen, soweit diese nicht
            allgemein bekannt sind, dem Empfänger bereits vorher, ohne Verpflichtung zur Geheimhaltung bekannt waren;
            oder dem Empfänger von einem Dritten ohne Geheimhaltungsverpflichtung mitgeteilt bzw. überlassen wurden,
            oder vom Empfänger nachweislich unabhängig entwickelt worden sind, oder aufgrund einer rechtskräftigen
            behördlichen oder richterlichen Entscheidung offen zu legen sind.
          </li>
        </ol>
        <h3 id="änderungen-der-bedingungen">Änderungen der Bedingungen</h3>
        <ol type="1">
          <li>
            Änderungen dieser AGBs werden dem Chipinhaber vor dem Zeitpunkt ihres Wirksamwerdens im Internet im
            Eventportal (pay.stustaculum.de) mitgeteilt. Die Zustimmung des Chipinhabers gilt als erteilt, wenn er seine
            Ablehnung nicht vor dem Zeitpunkt des Wirksamwerdens der Änderungen angezeigt hat. Auf diese
            Genehmigungswirkung wird ihn der VERANSTALTER bei der Bekanntgabe besonders hinweisen.
          </li>
          <li>
            Sollten eine oder mehrere Bestimmungen der Richtlinie ganz oder teilweise unwirksam oder nicht durchführbar
            sein oder werden, wird die Gültigkeit der übrigen Bestimmungen hierdurch nicht berührt. Die unwirksame oder
            undurchführbare Bestimmung ist durch eine sinngemäße gültige Regelung zu ersetzen, die dem wirtschaftlichen
            Zweck der unwirksamen oder undurchführbaren Klausel am nächsten kommt.
          </li>
        </ol>
        <h3 id="anwendbares-recht-gerichtsstand">Anwendbares Recht, Gerichtsstand</h3>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Sofern der Chipinhaber keinen allgemeinen Gerichtsstand in
          Deutschland hat, ist Gerichtsstand der Sitz des Chipausstellers.
        </p>
      </Box>
    </Container>
  );
};
