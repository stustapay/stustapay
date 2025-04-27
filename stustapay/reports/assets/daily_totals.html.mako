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
        <h3 class="centered">Nach Betrieb</h3>
        <table class="daily-revenue-table">
          <thead>
            <tr class="table-header">
              <th class="table-field">Art</th>
              <th class="table-field">Betrieb</th>
              <th class="table-field">Zahlungsart</th>
              <th class="table-field">Anzahl Transaktionen</th>
              <th class="table-field">Anzahl Produkte</th>
              <th class="table-field">Summe</th>
            </tr>
          </thead>
          <tbody>
            % for line in lines_location:
            <tr>
              <td class="table-field">${line["order_type"]}</td>
              <td class="table-field">${line["node_name"]}</td>
              <td class="table-field">${line["payment_method"]}</td>
              <td class="table-field">${line["no_customers"]}</td>
              <td class="table-field">${line["no_products"]}</td>
              <td class="table-field">${format_money(line["total_price"])}</td>
            </tr>
            % endfor
          </tbody>
        </table>
      </div>
    </article>

    % for location in location_tables:
      <article>
        <h3 class="centered">${location[0][0]["node_name"]}</h3>
        <div id="tax-table-${location[0][0]["node_name"]}">
          <h3 class="centered">Nach Steuersatz (nur Eintritt und Verkauf)</h3>
            <table class="daily-revenue-table">
              <thead>
                <tr class="table-header">
                  <th class="table-field">Steuersatz</th>
                  <th class="table-field">Anzahl Transaktionen</th>
                  <th class="table-field">Anzahl Produkte</th>
                  <th class="table-field">Summe inkl. USt</th>
                  <th class="table-field">Summe USt.</th>
                  <th class="table-field">Summe exkl. USt</th>
                  <th class="table-field">Anzahl Stornos</th>
                  <th class="table-field">Summe Stornos</th>

                </tr>
              </thead>
              <tbody>
                % for line in location[0]:
                <tr>
                  <td class="table-field">${format_percent(line["tax_rate"]) if type(line["tax_rate"]) == float else line["tax_rate"]}</td>
                  <td class="table-field">${line["no_customers"]}</td>
                  <td class="table-field">${line["no_products"]}</td>
                  <td class="table-field">${format_money(line["total_price"])}</td>
                  <td class="table-field">${format_money(line["total_tax"])}</td>
                  <td class="table-field">${format_money(line["total_notax"])}</td>
                  <td class="table-field">${line["no_cancels"]}</td>
                  <td class="table-field">${format_money(line["total_cancels"])}</td>
                </tr>
                % endfor
              </tbody>
            </table>
        </div>

        <div id="product-table-${location[0][0]["node_name"]}">
          <h3 class="centered">Nach Produkt</h3>
            <table class="daily-revenue-table">
              <thead>
                <tr class="table-header">
                  <th class="table-field">Name</th>
                  <th class="table-field">Anzahl Verkauft</th>
                  <th class="table-field">Summe inkl. USt</th>
                  <th class="table-field">Steuersatz</th>
                  <th class="table-field">Gegen Gutschein</th>
                  <th class="table-field">Wert Gutscheine</th>
                </tr>
              </thead>
              <tbody>
                % for line in location[1]:
                <tr>
                  <td class="table-field">${line["product_name"]}</td>
                  <td class="table-field">${line["no_products"]}</td>
                  <td class="table-field">${format_money(line["total_price"])}</td>
                  <td class="table-field">${format_percent(line["tax_rate"]) if type(line["tax_rate"]) == float else line["tax_rate"]}</td>
                  <td class="table-field">${line["no_discounted"]}</td>
                  <td class="table-field">${format_money(line["total_discounted"])}</td>
                </tr>
                % endfor
              </tbody>
            </table>
        </div>
      </article>
    % endfor

  </body>
</html>
