# Core Server

## Setup
- Copy `etc/server.conf` to `server.conf` and edit accordingly
- Create a postgres database and load the initial schema:
  ```sql
  $ psql
  > create database stustapay owner to username;
  > \c stustapay
  > \i schema.sql
  ```

## Operation

- Start the websocket server: `python -m stustapay.core websocket`


## Payment Procedure
- `create_order`: Start a new order in the database
- `add_to_order`: select items which will be boughg in this order and show the current order
- `process_order`: specify an account to book the order to and check if the order can be finished
