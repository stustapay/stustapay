StuStaPay
=========

Electronic Payment System for Festivals, developed for [StuStaCulum](https://stustaculum.de)

Use NFC wristbands to quickly pay at events!


<img style="float: right; width: 25%;" src="doc/logo.png" alt="StuStaPay logo"/>


## Idea
- Free software digital payment system for festivals
- Every user has a NFC chip (in their wristband)
- Users can top up their credit via Cash, card or online payment services
- They can buy products at points of sales, where their credits are deduced
- Designed to comply with German fiscal laws (digital signatures with TSE)


## Documentation
- [Installation guide](doc/install.md)
- [Core](doc/core.md)
- [App](doc/app.md)
- [Management Website](doc/administration.md)
- [User Self-Service Portal](doc/userportal.md)


## Components

### Core
All transactions go through the core.

#### Database
The database ensures transaction-safe handling of the payment processing logic.
It's the source of truth for account funds, order processing and offered products.

#### Core Server
Python tool which handles PoS requests over websocket.

#### TSE signatures
All transactions need to be signed by a [federally approved security module](https://de.wikipedia.org/wiki/Technische_Sicherheitseinrichtung) (as defined by [Kassensicherungsverordnung - KassenSichV](https://de.wikipedia.org/wiki/Kassensicherungsverordnung))

### App
- Operated at points of sale
- Is connected via websocket to StuStaPay core
- Registers customer's orders
- Can scan and validate NFC tags


### Webapps
Each one run on separate Python webserver, which talks to the core database.

#### Administration site
Configuration of products, cash desks, accounts, ...

#### User Self Service Portal
- Top up account with online payment
- Get payment reciepes
- Pay back money after the event


## Tech stack

### Core
- Python
- PostgreSQL DB
- asyncpg
- aiohttp

optional:
- TSE module

### Point of Sales
- Android telephone with NFC reader

### Webapps for Management and User Self-Service
- react
- nodejs


## License

Released under the **GNU Affero General Public License** version 3 or later,
see [authors](authors.md) and [license](LICENSE) for details.
