# Core Server

## Setup
- Copy `etc/server.conf` to `server.conf` and edit accordingly
- Create a postgres database:
  ```sql
  $ psql
  > create database stustapay owner to username;
  ```
- Apply the stustapay schema
  ```shell
  python -m stustapay.core -vvv database rebuild
  ```
- To load some test data run
  ```shell
  python -m stustapay.core -vvv database add_data
  ```
 

## Operation

- To get a database shell: `python -m stustapay.core psql`
- To run the administration backend run
  ```shell
  python -m stustapay.administration -vvv api
  ```
  You can check out the api documentation at `http://localhost:8081/docs`, (port subject to change depending on your dev config)
- To run the terminal backend run
  ```shell
  python -m stustapay.terminalserver -vvv api
  ```
  You can check out the api documentation at `http://localhost:8082/docs`, (port subject to change depending on your dev config)
