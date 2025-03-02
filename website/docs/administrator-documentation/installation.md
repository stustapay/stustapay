# Installation

:::info

Currently only installations on **Debian 11 (bookworm)** are supported.

:::

Head over to the [GitHub Release Page](https://github.com/stustapay/stustapay/releases) and download the debian package for the respective version.

Install the debian package

```bash
sudo apt install ./stustapay_<version>+bookworm1_amd64.deb
```

## Setup Postgres database

Install postgres (either on the same server or on a different server).

```bash
sudo apt install postgresql
```

Create a new user and database (names can be altered).

```sql
$ sudo -u postres psql
> create role stustapay with password '<secure password';
> create database stustapay owner stustapay;
```

Update `/etc/stustapay/config.yaml` and update the database connection information.

In case postgres is not running on the same server as your stustapay installation make sure to configure tls encryption in postgres.
You can turn on tls encryption for the stustapay database connection by configuring the tls root certificate and setting `require_ssl: true`.

```yaml title="/etc/stustapay/config.yaml"
database:
  # ...
  require_ssl: true
  sslrootcert: </path/to/rootcert>
```

## Configure StuStaPay

Generate a production application secret e.g. via `pwgen -s 64 1` and configure it.

```yaml title="/etc/stustapay/config.yaml"
core:
  secret_key: "<your secret>"
```

### Configure Bon Generation

The StuStaPay bon generation is based on rendering Latex templates, it is therefore required to install the respective latex packages

TODO: the following list of texlive package requirements is not up to date and should be added to the debian package

```bash
sudo apt install texlive latexmk
```

Additionally you need to decide how many bon generator workers should be spawned. In our testing the bon generation took
about ~0.5 seconds per bon. Depending on the number of orders per second you are expecting set the `n_workers` setting accordingly.

```yaml title="/etc/stustapay/config.yaml"
bon:
  n_workers: 4
```

### Test Mode

The default config will contain the key `test_mode` set to `true`.
This is essentially just a flag to enable a red banner in both the administration UI and the customer portal to differentiate between production and test setups. We recommend leaving this enabled for the time being until you're comfortable with the setup and are ready to switch to production mode.
An optional message can be configured in this test mode banner via `test_mode_message`.

## Migrate the database

Simply run

```bash
sudo -u stustapay stustapay db migrate
```

You can always open a `psql` shell to the currently configured database by running

```bash
sudo -u stustapay stustapay db attach
```

## Configure Nginx

Installing the debian package will also install some initial nginx config files for the terminal api, admin portal and customer portal.

These can be found under `/etc/nginx/sites-available/stustapay-*`.
They are mostly ready, you just need to configure TLS certificates and update the `server_name` settings with your desired domains.

Then just activate them via

```bash
ln -s /etc/nginx/sites-available/stustapay-* /etc/nginx/sites-enabled/
```

## Start the Services

```bash
sudo systemctl enable --now stustapay-administration-api.service
sudo systemctl enable --now stustapay-terminal-api.service
sudo systemctl enable --now stustapay-customerportal-api.service
sudo systemctl enable --now stustapay-tse-controller.service
sudo systemctl enable --now stustapay-payment-processor.service
# start and enable as many bon generator instances as you've configured bon workers
sudo systemctl enable --now stustapay-bon-generator@0.service
```
