# Installation

## Core Setup

- Copy `etc/server.yaml` to `server.yaml` and edit accordingly
- Setup Postgres role and DB:
  ```sql
  $ sudo -u postgres psql
  > create role <username> with login;
  > create database stustapay owner <username>;
  > \c stustapay
  > alter schema public owner to <username>;
  ```
- Apply the stustapay schema
  ```shell
  python -m stustapay -c server.yaml -vvv db rebuild
  ```
- To load some test data run the following command. Test data is defined
  in `stustapay/core/schema/example_data/example_data.sql`.
  ```shell
  python -m stustapay -c server.yaml -vvv db add-data
  ```

## Admin UI Backend

- Run the backend API server

```shell
python -m stustapay -c server.yaml -vvv administration-api
```

## Customer Portal Backend

- Start API

```shell
python -m stustapay -c server.yaml -vvv customerportal-api
```
