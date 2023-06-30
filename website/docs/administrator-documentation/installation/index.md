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
  python -m stustapay.core -c server.yaml -vvv database rebuild
  ```
- To load some test data run the following command. Test data is defined in `stustapay/core/schema/example_data/example_data.sql`.
  ```shell
  python -m stustapay.core -c server.yaml -vvv database add_data
  ```

## Admin UI Backend
- Run the backend API server
```shell
python -m stustapay.administration -c server.yaml -vvv api
```

## Customer Portal Backend
- Start API
```shell
python -m stustapay.customer_portal -c server.yaml -vvv api
```
