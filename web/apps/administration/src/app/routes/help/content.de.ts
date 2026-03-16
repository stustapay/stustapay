import { HelpContent } from "./types";
import { helpLinkTargets } from "./targets";

export const helpContentDe: HelpContent = {
  sections: [
    {
      id: "navigation",
      title: "Einstieg und Navigation",
      summary: "So findest du dich im Portal zurecht und wechselst zwischen Events und Bereichen.",
      body: `
Nutze die linke Baum-Navigation als Ausgangspunkt für alle eventbezogenen Aufgaben.

- Wähle zuerst den passenden Knoten oder das richtige Event im linken Menü.
- Die obere Leiste enthält globale Aktionen wie **Profil**, **Sprache**, **Abmelden** und diese **Anleitung**.
- Die Tabs innerhalb eines Bereichs wechseln nur den Unterbereich des aktuell gewählten Knotens.
- Wenn du zwischen mehreren Events arbeitest, kontrolliere vor Änderungen immer den aktuell markierten Knoten.
      `,
      links: [
        {
          label: "Profil öffnen",
          description: "Eigene Zugangsdaten und Darstellung prüfen",
          to: helpLinkTargets.profile,
        },
        {
          label: "Aktuelles Event öffnen",
          description: "Zur Übersicht des aktuellen Knotens springen",
          buildTo: helpLinkTargets.nodeOverview,
          requiresNodeContext: true,
        },
      ],
    },
    {
      id: "event-setup",
      title: "Events, Knoten und Grundeinstellungen",
      summary: "Hier pflegst du Stammdaten, Portaltexte, Zahlungseinstellungen und die Eventstruktur.",
      body: `
Die Übersichts- und Einstellungsseiten sind der richtige Einstieg für neue Events oder Strukturänderungen.

1. Öffne zuerst die **Übersicht**, um den aktuellen Status des Knotens zu prüfen.
2. Wechsle danach in **Einstellungen**, um allgemeine Eventdaten, E-Mail-Texte, FAQ, Bon- oder Customer-Portal-Inhalte zu pflegen.
3. Nutze **Statistiken**, wenn du prüfen willst, ob sich Änderungen bereits in Buchungen oder Besucherzahlen auswirken.

Typische Aufgaben in diesem Bereich:

- neues Event oder Kindknoten anlegen
- Eventtexte und rechtliche Seiten pflegen
- SumUp-, Mail- oder Auszahlungsparameter prüfen
- DSFinV-K-Export vorbereiten
      `,
      links: [
        {
          label: "Knoten-Übersicht",
          description: "Status, Kennzahlen und Schnellzugriff für den aktuellen Knoten",
          buildTo: helpLinkTargets.nodeOverview,
          requiresNodeContext: true,
        },
        {
          label: "Knoten-Einstellungen",
          description: "Allgemeine Einstellungen und Eventtexte bearbeiten",
          buildTo: helpLinkTargets.nodeSettings,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Statistiken",
          description: "Kennzahlen, Tabellen und Live-Auswertungen öffnen",
          buildTo: helpLinkTargets.nodeStats,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "DSFinV-K Export",
          description: "Export für Kassenprüfungen oder Buchhaltung aufrufen",
          buildTo: helpLinkTargets.dsfinvk,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "users-and-rights",
      title: "Benutzer, Rollen und Rechte",
      summary: "Verwalte Benutzerkonten, Rollen und die Zuordnung von Rechten im Event.",
      body: `
In diesem Bereich steuerst du, wer im Portal arbeiten darf und welche Aufgaben sichtbar sind.

- **Benutzer** verwalten reale Accounts mit Login und Profil.
- **Rollen** bündeln Berechtigungen für bestimmte Aufgabenbereiche.
- **Benutzer zu Rollen** ordnet Rollen auf Knotenebene zu.

Empfohlener Ablauf für neue Teammitglieder:

1. Benutzerkonto anlegen oder prüfen.
2. Passende Rolle auswählen oder anlegen.
3. Rolle dem Benutzer am richtigen Knoten zuweisen.
4. Anschließend im betroffenen Event testen, ob nur die gewünschten Bereiche sichtbar sind.
      `,
      links: [
        {
          label: "Benutzer",
          description: "Accounts anlegen, bearbeiten und prüfen",
          buildTo: helpLinkTargets.users,
          requiresNodeContext: true,
        },
        {
          label: "Rollen",
          description: "Berechtigungsrollen verwalten",
          buildTo: helpLinkTargets.userRoles,
          requiresNodeContext: true,
        },
        {
          label: "Benutzer zu Rollen",
          description: "Rollen auf Knotenebene zuweisen",
          buildTo: helpLinkTargets.userAssignments,
          requiresNodeContext: true,
        },
      ],
    },
    {
      id: "products-and-tickets",
      title: "Produkte, Tickets und Preise",
      summary: "Pflege verkaufbare Artikel, Tickettypen und steuerliche Grundlagen.",
      body: `
Lege hier alle Angebote an, die an Kassen, im Customer Portal oder an Entry-Punkten verwendet werden.

- **Produkte** decken reguläre Verkaufsartikel und Aufladungen ab.
- **Tickets** werden für Eintrittslogik und Ticketverkauf benötigt.
- **Steuersätze** sollten vor der Pflege von Produkten und Tickets sauber angelegt sein.

Praktischer Ablauf:

1. Steuersätze kontrollieren oder anlegen.
2. Produkte und Preise pflegen.
3. Tickets und Restriktionen prüfen.
4. Danach an Kassenlayouts oder Entry-Bereichen kontrollieren, ob alles am richtigen Ort auftaucht.
      `,
      links: [
        {
          label: "Produkte",
          description: "Verkaufsartikel und Preise pflegen",
          buildTo: helpLinkTargets.products,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Tickets",
          description: "Tickettypen und Einlasslogik verwalten",
          buildTo: helpLinkTargets.tickets,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Steuersätze",
          description: "Steuerlogik für Produkte und Tickets pflegen",
          buildTo: helpLinkTargets.taxRates,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "customers-and-tags",
      title: "Kunden, Konten und User-Tags",
      summary: "Hier verwaltest du Guthaben, Kundensuche, NFC-Tags und Kontozuordnungen.",
      body: `
Diese Bereiche sind wichtig für Supportfälle während des laufenden Events.

- **Kunden** zeigt Konten, Salden, Buchungen und Auszahlungsbezüge.
- **Konten** ist der richtige Ort für Kontensuche und Geldbewegungen.
- **User-Tags** verwaltet Armbänder, Karten, CSV-Importe und Tag-Secrets.

Typische Einsätze:

- Konto oder Tag eines Besuchers suchen
- Guthaben umbuchen oder prüfen
- neue Tag-Serien importieren
- fehlende Kontozuordnungen nachvollziehen
      `,
      links: [
        {
          label: "Kunden",
          description: "Kundenübersicht und Detailseiten öffnen",
          buildTo: helpLinkTargets.customers,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Konten",
          description: "Kontensuche und Saldenverwaltung",
          buildTo: helpLinkTargets.accounts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "User-Tags",
          description: "Tags suchen, importieren und Secrets pflegen",
          buildTo: helpLinkTargets.userTags,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "terminals-and-tills",
      title: "Terminals, Kassen und Layouts",
      summary: "Konfiguriere Geräte, Kassenprofile, Layouts und Bargeldprozesse.",
      body: `
Hier bereitest du den operativen Verkauf am Event vor.

- **Terminals** verwalten physische Geräte und ihre Zuordnung.
- **Kassen** enthalten die operative Logik am POS.
- **Kassenprofile** und **Kassenlayouts** steuern Verhalten und Oberfläche.
- **Registrierkassen** und **Bestückungen** helfen bei Bargeld- und Schubladenprozessen.

Empfohlene Reihenfolge für neue Setups:

1. Terminal und Kasse anlegen
2. Profil und Layout definieren
3. Buttons und Produkte kontrollieren
4. Registrierkassen und Bestückung vorbereiten
5. Vor Ort an einem Gerät testen

Empfohlener Workflow für **Produkt -> Layout -> Profil -> Kasse**:

1. Produkt anlegen oder aktualisieren
2. im Kassenlayout prüfen, ob das Produkt als Button an der richtigen Stelle sichtbar ist
3. kontrollieren, welches Kassenprofil dieses Layout verwendet oder verwenden soll
4. das passende Profil der gewünschten Kasse zuweisen
5. die Kasse am Terminal öffnen und den Verkauf einmal praktisch testen
      `,
      links: [
        {
          label: "Terminals",
          description: "Geräte verwalten und prüfen",
          buildTo: helpLinkTargets.terminals,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Kassen",
          description: "POS-Kassen und deren Details öffnen",
          buildTo: helpLinkTargets.tills,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Kassenprofile",
          description: "Profile und Defaults für Kassen pflegen",
          buildTo: helpLinkTargets.tillProfiles,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Kassenlayouts",
          description: "Buttons, Seiten und Layout-Struktur anpassen",
          buildTo: helpLinkTargets.tillLayouts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Registrierkassen",
          description: "Bargeldschubladen und Zuweisungen verwalten",
          buildTo: helpLinkTargets.cashRegisters,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "operations-and-finance",
      title: "Bestellungen, Auszahlungen, Statistiken und Exporte",
      summary: "Nutze diese Bereiche für Controlling, Support und Abschlussarbeiten.",
      body: `
Während des Events und beim Abschluss laufen hier die wichtigsten Kontrollprozesse zusammen.

- **Statistiken** zeigen Umsatz-, Mengen- und Prognosedaten.
- **Auszahlungen** bündeln Auszahlungsläufe und offene Rückzahlungen.
- **DSFinV-K** unterstützt steuerliche Exporte.
- Bestell- und Transaktionsdetails werden meist aus Statistiken, Kunden- oder Kassiervorgängen heraus geöffnet.

Für operative Nachverfolgung ist es sinnvoll, zuerst in die Statistiken oder Kundendetails zu gehen und von dort in einzelne Vorgänge zu springen.
      `,
      links: [
        {
          label: "Statistiken",
          description: "Live-KPIs, Tabellen und Detailauswertungen",
          buildTo: helpLinkTargets.nodeStats,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Auszahlungsläufe",
          description: "Payout-Prozesse verwalten und exportieren",
          buildTo: helpLinkTargets.payouts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "DSFinV-K Export",
          description: "Steuerrelevante Exporte öffnen",
          buildTo: helpLinkTargets.dsfinvk,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "integrations-and-entry",
      title: "Entry, TSE, SumUp und Integrationen",
      summary: "Hier findest du die Bereiche für Einlass, Fiskalisierung, mobile Geräte und Zahlungsintegrationen.",
      body: `
Diese Bereiche sind besonders wichtig, wenn Hardware, externe Dienste oder Einlassprozesse beteiligt sind.

- **Entry** verwaltet Bereiche, Gruppen und Logs für den Zutritt.
- **TSE** verwaltet Fiskalisierung und technische Sicherheitseinrichtungen.
- **SumUp** zeigt Transaktionen und Checkouts, sofern am Event aktiviert.
- **Headwind / MDM** hilft bei Android-Geräten und deren Status.

Bei Problemen prüfst du am besten erst, ob du im richtigen Event bist und ob die jeweilige Integration dort überhaupt aktiviert ist.

Empfohlener **Einlass-Workflow**:

1. Tickets und Produktlogik prüfen, damit die richtigen Zutrittsrechte vorhanden sind
2. Entry-Bereiche anlegen und die gewünschten Gruppen oder Regeln zuordnen
3. Entry-Scanner oder Terminals dem richtigen Event und Bereich zuordnen
4. einen Testscan mit einem gültigen und einem ungültigen Ticket durchführen
5. anschließend die Entry-Logs kontrollieren, um Freigaben und Ablehnungen nachzuvollziehen
      `,
      links: [
        {
          label: "Entry-Bereiche",
          description: "Einlassbereiche und Gruppen pflegen",
          buildTo: helpLinkTargets.entryAreas,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Entry-Logs",
          description: "Einlassereignisse und Fehlerfälle prüfen",
          buildTo: helpLinkTargets.entryLogs,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "TSE",
          description: "Fiskalisierungsgeräte verwalten",
          buildTo: helpLinkTargets.tses,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "SumUp",
          description: "Zahlungsintegration und Transaktionen prüfen",
          buildTo: helpLinkTargets.sumup,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Headwind / MDM",
          description: "Geräteverwaltung für Android-Terminals",
          buildTo: helpLinkTargets.mdm,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
  ],
};
