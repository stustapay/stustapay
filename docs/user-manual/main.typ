#set text(lang: "de")

#v(4em)
#align(center, text(30pt)[*StuStaPay Nutzerhandbuch*])
#align(center, text(18pt)[
  _Das StuStaPay Team_

  Verein Kulturleben in der Studentenstadt e.V.
])
#align(center, text(12pt)[
  #datetime.today().display()
])
#v(4em)

#outline()
#v(4em)

#text(18pt)[*Kontakt*]
#v(0em)
Falls ein Problem mit dem Terminal auftritt sollte als erstes die App mit dem Knopf in der Home-Ansicht neu gestartet werden.

Wenn das Problem danach weiterhin besteht, sollte umgehend unser Team kontaktiert werden. (Kontaktdaten hier einfügen)

#pagebreak()

#set page(
  header: [
    StuStaPay Nutzerhandbuch
    #h(1fr)
    #datetime.today().display()
  ],
  numbering: "1"
)

= Registrierung
Die initiale Registrierung der Terminals muss von den Admins der jeweiligen StuStaPay Instanz vorgenommen werden.
Bei der Registrierung wird das Layout und die Funktionen des Terminals festgelegt.
Das Layout definiert die Produkte (falls vorhanden), und ob ein Freipreisfeld verfügbar ist.
Für Stände ist nur die Kassierfunktion aktiviert.
Der Verkauf von Eintrittsändchen und Guthaben ist also nicht möglich.

Bei der Registrierung werden auch Konten für die Standbetreiber und Kassierer angelegt.
Jeder Standbetreiber und Kassierer braucht ein registriertes Eintrittsbändchen, um sich an dem Terminal einloggen zu können.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/not_registered.png", height: 18em),
    caption: [Ein nicht-registriertes Terminal]
  )],
  [#figure(
    image("assets/img/no_login.png", height: 18em),
    caption: [Ein registriertes Terminal]
  )]
)

#pagebreak()

= Einloggen
Standbetreiber können sich über das Menü "Benutzer" einloggen.
Auf Druck des Knopfes "Einloggen" erscheint ein Dialog, der einen zum scannen des Eintrittsbändchens auffordert.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/login_button.png", height: 18em),
    caption: [Die Benutzer-Ansicht vor dem Einloggen]
  )],
  [#figure(
    image("assets/img/login_scan.png", height: 18em),
    caption: [Der Scan-Dialog in der Benutzer-Ansicht]
  )]
)

Falls das Benutzerkonto mehrere Rollen besitzt erscheint nun ein Dialog, mit dem man die Rolle auswählen kann.
Verschiedene Rollen haben üblicherweise Zugriff auf unterschiedliche Teile des Systems.
Die Kassierer-Rolle kann zum Beispiel die Rechte haben, Produkte zu verkaufen, während eine Standbetreiber-Rolle meistens nicht verkaufen, dafür aber Umsätze einsehen oder weitere Benutzer erstellen kann.
Standbetreiber haben meistens mehrere Rollen, um sowohl auf die Verwaltungsfunktionen, als auch die Kassierfunktionen des Systems zugreifen zu können.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/login_role.png", height: 18em),
    caption: [Die Rollen-Auswahl nach dem Scannen]
  )],
  [#figure(
    image("assets/img/change_role.png", height: 18em),
    caption: [Die Benutzer-Ansicht nach dem Einloggen]
  )]
)

Kassierer können sich außerdem nicht direkt selbst einloggen, sondern müssen vom Standbetreiber eingeloggt werden.
Dies geschieht, indem dieser sich zuerst selbst mit der Standbetreiber-Rolle einloggt und mit dem Knopf "Nutzer oder Rolle wechseln" danach den Kassierer einloggt.

#pagebreak()

= Home-Ansicht
Von der Home-Ansicht aus kann auf alle Teile des Systems zugegriffen werden.
Je nach eingeloggter Rolle sind hier unterschiedliche Menüpunkte verfügbar.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/cashier_home.png", height: 18em),
    caption: [Die Home-Ansicht eines Kassierers]
  )],
  [#figure(
    image("assets/img/orga_home.png", height: 18em),
    caption: [Die Home-Ansicht eines Orgas]
  )]
)

#pagebreak()

= Kassieren
Um kassieren zu können, muss man als Kassierer-Rolle eingeloggt sein.
Wenn dies der Fall ist, ist auf der Home-Ansicht das Menü "Verkauf" sichtbar.
Dieses beinhaltet die Verkaufsansicht mit einer Liste an allen verfügbaren Produkten oder einem Freipreisfeld, je nach registriertem Layout.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/order.png", height: 18em),
    caption: [Die Kassierer-Ansicht mit einem Freipreisfeld]
  )],
  [#figure(
    image("assets/img/order_confirm.png", height: 18em),
    caption: [Übersicht über den Verkauf nach dem Scan]
  )]
)

Den Kauf bestätigt man mit der blauen Taste unten rechts, woraufhin ein Scan-Dialog erscheint.
Nun muss der Kassierer das Eintrittsbändchen des Kunden scannen.
Wenn der Kunde genügend Guthaben für den Verkauf hat, wird nun eine Bestätigungsansicht angezeigt.
Diese sollte dem Kunden vor dem Bestätigen präsentiert werden.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/order_success.png", height: 18em),
    caption: [Bestätigung des Verkaufs]
  )],
  [#figure(
    image("assets/img/order_not_enough_funds.png", height: 18em),
    caption: [Fehlermeldung, wenn der Kunde nicht genügend Guthaben hat]
  )]
)

#pagebreak()

= Kontostand
Falls ein Kunde seinen Kontostand sehen möchte, kann dieser über den Menüpunkt "Kontostand" eingesehen werden.
Hierzu muss das Eintrittsbändchen des Kunden gescannt werden.

#figure(
  image("assets/img/account_status.png", height: 18em),
  caption: [Kontostandansicht nach Scannen des Eintrittsbändchens]
)

#pagebreak()

= Verkaufshistorie
Mit dem Menüpunkt "Bestellverlauf" können die letzten Verkäufe des Terminals eingesehen werden.
Es ist hier außerdem möglich, die letzte Transaktion zu stornieren.
Dies sollte allerdings nur im Ausnahmefall getan werden und stattdessen schon in der Kassierer-Ansicht bei der Verkaufsbestätigung geprüft werden, ob die Transaktion richtig ist.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/history.png", height: 18em),
    caption: [Bestellverlauf]
  )],
  [#figure(
    image("assets/img/history_detail.png", height: 18em),
    caption: [Details pro Transaktion. Nur die letzte (oberste in der Liste) kann storniert werden]
  )]
)

#pagebreak()

= Umsatzübersicht
Unter dem Menü "Statistik" (nur als Standbetreiber-Rolle einsehbar) befinden sich Umsatzberichte in täglicher und stündlicher Auflösung.
Die Statistiken beinhalten den Umsatz des gesamten Standes.
Falls ein Stand also mehrere Terminals hat ist hier die Summe der Verkäufe aller Terminals zu sehen.

#grid(
  columns: (1fr, 1fr),
  [#figure(
    image("assets/img/stats.png", height: 18em),
    caption: [Die Statistik-Ansicht]
  )],
  [#figure(
    image("assets/img/stats_hourly.png", height: 18em),
    caption: [Stündlicher Umsatz in der Statistik-Ansicht]
  )]
)

