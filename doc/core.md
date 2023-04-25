# Core Server

## Setup
- Copy `etc/server.conf` to `server.conf` and edit accordingly
- Create a postgres database:
  ```sql
  $ psql
  > create database stustapay owner <username>;
  ```
- Apply the stustapay schema
  ```shell
  python -m stustapay.core -c server.conf -vvv database rebuild
  ```
- To load some test data run the following command. Test data is defined in `stustapay/core/schema/example_data/example_data.sql`.
  ```shell
  python -m stustapay.core -c server.conf -vvv database add_data
  ```


## Operation

- To get a database shell: `python -m stustapay.core psql`
- To run the administration backend run
  ```shell
  python -m stustapay.administration -c server.conf -vvv api
  ```
  You can check out the api documentation at `http://localhost:8081/docs`, (port subject to change depending on your dev config)
- To run the terminal backend run
  ```shell
  python -m stustapay.terminalserver -c server.conf -vvv api
  ```
  You can check out the api documentation at `http://localhost:8082/docs`, (port subject to change depending on your dev config)

## VS Code
When using DevContainer make sure to forward the port globally. Otherwise the till will not be able to connect.
In the VSCode Settings set Remote: Local Port Host to `allInterfaces`
![https://stackoverflow.com/a/67997839](https://i.stack.imgur.com/oM0zl.png)
