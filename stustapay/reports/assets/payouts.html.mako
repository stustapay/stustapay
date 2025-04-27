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
        <h3 class="centered">Übersicht Online-Auszahlungen</h3>
        <table class="overview-table">
          <tbody>
            <tr>
              <td>Stand</td>
              <td>${format_datetime(date)}</td>
            </tr>
            <tr>
              <td>Anzahl nicht zurückgeforderter Guthaben</td>
              <td>${remaining_balances["remaining_customers"]}</td>
            </tr>
            <tr>
              <td>Summe übriger Guthaben</td>
              <td>${format_money(remaining_balances["remaining_balances"])}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="base-table">
        <h3 class="centered">Online-Auszahlungen</h3>
        <table class="daily-revenue-table">
          <thead>
            <tr class="table-header">
              <th>Ausgeführt am</th>
              <th>Anzahl Auszahlungen/Spenden</th>
              <th>Summe Auszahlungen</th>
              <th>Summe Spenden</th>
            </tr>
          </thead>
          <tbody>
            % for payout in payouts:
            <tr>
              <td>${format_datetime(payout["set_done_at"])}</td>
              <td>${payout["n_payouts"]}</td>
              <td>${format_money(payout["total_payout_amount"])}</td>
              <td>${format_money(payout["total_donation_amount"])}</td>
            </tr>
            % endfor
          </tbody>
        </table>
      </div>
    </article>

  </body>
</html>
