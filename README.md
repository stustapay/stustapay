StuStaPay
=========

Electronic Payment System for StuStaCulum

<img style="float: right; width: 25%;" src="doc/logo.png" alt="StuStaPay logo"/>


## Requirements

### Server
- Python
- PostgreSQL DB
- asyncpg
- aiohttp

### Cash Desk
- Python
- Qt6
- PySide6
- Qt6 Declarative (QML)
- aiohttp


## Documentation
- [Server](doc/server.md)
- [Cash desk](doc/cashdesk.md)


## Components
- PostgreSQL database [schema](stustapay/server/schema/)
- Central [server](stustapay/server)
- Qt Cash desk [client](stustapay/client)


### Database
The database ensures transaction-safe handling of the payment processing logic.
It's the source of truth for account funds, order processing and offered products.

### Middleware
The `aiohttp` python middleware exposes the database functions via a websocket, for a frontend to connect to.

### Qt Client
The client connects to the websocket and selects which items are bought by an account.


## History
The first prototype was created in 36h at HackaTUM 2022 on 2022-11-19 by
- Leo Fahrbach
- Jonas Jelten
- Lars Frederik Peiss


## License

Released under the **GNU Affero General Public License** version 3 or later,
see [COPYING](COPYING) and [LICENSE](LICENSE) for details.
