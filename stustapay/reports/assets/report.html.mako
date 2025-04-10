<%
def format_money(value):
  return f"{value:8.2f}{currency_symbol}".replace(".", ",")

def format_datetime(value):
  return value.strftime("%Y-%m-%d %H:%M:%S")

def format_percent(value):
  return f"{value * 100:5.2f}%".replace(".", ",")

%>

<html>
  <head>
    <meta charset="utf-8">
    <title>Revenue Report</title>
    <meta name="description" content="Invoice demo sample">
  </head>

  <body>
    % if render_logo:
      <header id="logo">
      </header>
    % endif

    <article>

      <div id="header">
        <span id="header-name">StuStaPay</span>
        <span id="header-title">Umsatzbericht</span>
        <span id="header-event">${event_name}</span>
      </div>

      <aside>
        <address id="from">
          ${config["issuer"]}
          ${config["address"].strip()}
          USt-IdNr. ${config["ust_id"]}
        </address>

        <address id="to">
          ${node["name"]}
          ${node["description"]}
        </address>
      </aside>

      <div id="overview">
        <h3 class="centered">Übersicht</h3>
        <table class="overview-table">
          <tbody>
            <tr>
              <td>Beginn</td>
              <td>${format_datetime(from_time)}</td>
            </tr>
            <tr>
              <td>Letzer berücksichtigter Zeitpunkt</td>
              <td>${format_datetime(to_time)}</td>
            </tr>
            <tr>
              <td>Gesamtumsatz</td>
              <td>${format_money(total_revenue)}</td>
            </tr>
            <tr>
              <td>Gebühren</td>
              <td>${format_money(fees)} (${format_percent(fees_percent)})</td>
            </tr>
            <tr>
              <td>Auszahlung nach Gebühren</td>
              <td>${format_money(revenue_minus_fees)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="daily-overview">
        <h3 class="centered">Nach Tagen</h3>
        <table class="daily-revenue-table">
          <thead>
            <tr class="table-header">
              <th>Datum</th>
              <th>Gesamtumsatz</th>
              <th>Gebühren</th>
              <th>Auszahlung</th>
            </tr>
          </thead>
          <tbody>
            % for daily in daily_revenue_stats:
            <tr>
              <td>${daily["day"]}</td>
              <td>${format_money(daily["revenue"])}</td>
              <td>${format_money(daily["fees"])}</td>
              <td>${format_money(daily["revenue_minus_fees"])}</td>
            </tr>
            % endfor
          </tbody>
        </table>
      </div>
    </article>

    <article>
      <div id="transactions">
        <h3 class="centered">Einzelauflistung</h3>
        <table class="transaction-table">
          <thead>
            <tr class="table-header">
              <th>Datum & Uhrzeit</th>
              <th>Transaktionsnummer</th>
              <th>Betrag</th>
              <th>Gebühr</th>
              <th>Auszahlung</th>
            </tr>
          </thead>
          <tbody>
            % for order in orders:
            <tr>
              <td>${format_datetime(order["booked_at"])}</td>
              <td>${f"{order['id']:010}"}</td>
              <td>${format_money(order["total_price"])}</td>
              <td>${format_money(order["fees"])}</td>
              <td>${format_money(order["total_price_minus_fees"])}</td>
            </tr>
            % endfor
          </tbody>
        </table>
      </div>
    </article>
  </body>
</html>
