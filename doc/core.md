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

- To get a database shell: `python -m stustapay.core psql`
- Start the websocket server: `python -m stustapay.core terminalserver`
