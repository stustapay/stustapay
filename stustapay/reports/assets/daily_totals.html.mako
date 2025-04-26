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

      <div id="overview">
        <h3 class="centered">Gesamtübersicht</h3>
        <table class="overview-table">
          <tbody>
            <tr>
              <td>Beginn</td>
              <td>${format_datetime(from_time)}</td>
            </tr>
            <tr>
              <td>Erste Transaktions-ID</td>
              <td>${"-" if min_order_id is None else min_order_id}</td>
            </tr>
            <tr>
              <td>Letzer berücksichtigter Zeitpunkt</td>
              <td>${format_datetime(to_time)}</td>
            </tr>
            <tr>
              <td>Letzte Transaktions-ID</td>
              <td>${"-" if max_order_id is None else max_order_id}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="location-table">
        <h3 class="centered">Nach Stand/Ort</h3>
        <table class="daily-revenue-table">
          <thead>
            <tr class="table-header">
              <th>Art</th>
              <th>Betrieb</th>
              <th>Zahlung</th>
              <th>Transaktionen</th>
              <th>Produkte</th>
              <th>Summe</th>
            </tr>
          </thead>
          <tbody>
            % for line in lines_location:
            <tr>
              <td>${line["order_type"]}</td>
              <td>${line["node_name"]}</td>
              <td>${line["payment_method"]}</td>
              <td>${line["no_customers"]}</td>
              <td>${line["no_products"]}</td>
              <td>${format_money(line["total_price"])}</td>
            </tr>
            % endfor
          </tbody>
        </table>
      </div>
    </article>

    <article>
      % for table in tax_tables:
        <div id="tax-table-${table[0]["node_name"]}">
          <h3 class="centered">Nach Steuersatz (nur Eintritt und Verkauf) - ${table[0]["node_name"]}</h3>
            <table class="daily-revenue-table">
              <thead>
                <tr class="table-header">
                  <th>Steuersatz</th>
                  <th>Transaktionen</th>
                  <th>Produkte</th>
                  <th>Summe inkl. USt</th>
                  <th>Summe USt.</th>
                  <th>Summe exkl. USt</th>
                  <th>Stornos</th>
                  <th>Summe Stornos</th>

                </tr>
              </thead>
              <tbody>
                % for line in table:
                <tr>
                  <td>${format_percent(line["tax_rate"]) if type(line["tax_rate"]) == float else line["tax_rate"]}</td>
                  <td>${line["no_customers"]}</td>
                  <td>${line["no_products"]}</td>
                  <td>${format_money(line["total_price"])}</td>
                  <td>${format_money(line["total_tax"])}</td>
                  <td>${format_money(line["total_notax"])}</td>
                  <td>${line["no_cancels"]}</td>
                  <td>${format_money(line["total_cancels"])}</td>
                </tr>
                % endfor
              </tbody>
            </table>
        </div>
      % endfor
    </article>

    % for table in product_tables:
      <article>
        <div id="product-table-${table[0]["node_name"]}">
          <h3 class="centered">Nach Produkt - ${table[0]["node_name"]}</h3>
            <table class="daily-revenue-table">
              <thead>
                <tr class="table-header">
                  <th>Name</th>
                  <th>Anzahl Verkauft</th>
                  <th>Summe inkl. USt</th>
                  <th>Steuersatz</th>
                  <th>Summe USt.</th>
                  <th>Summe exkl. USt</th>

                </tr>
              </thead>
              <tbody>
                % for line in table:
                <tr>
                  <td>${line["product_name"]}</td>
                  <td>${line["no_products"]}</td>
                  <td>${format_money(line["total_price"])}</td>
                  <td>${format_percent(line["tax_rate"]) if type(line["tax_rate"]) == float else line["tax_rate"]}</td>
                  <td>${format_money(line["total_tax"])}</td>
                  <td>${format_money(line["total_notax"])}</td>
                </tr>
                % endfor
              </tbody>
            </table>
        </div>
      </article>
    % endfor
  </body>
</html>
