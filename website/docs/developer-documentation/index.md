---
sidebar_position: 10
---

# Developer Documentation

## Devcontainers

You can use vscode's [development containers](https://containers.dev/),
we've included a configuration file in the repo root.

After starting the devcontainer you can simply start up the core services and the web uis.

## Manual

Install the python requirements
```shell
pip install -e '.[dev,test]'
```

You should now have the `stustapay` command available.
It includes all sub commands need for development and deployment.
To start the API server for development use the our example config file in [`etc/server.yaml`](etc/server.yaml) and run:
```shell
stustapay -c etc/server.yaml -vvv simulate api --no-bon --no-tse
```
Run the [simulator](simulator.md) once to create the database scheme and some generate some test data.

# Web UIs
### Dependencies
For the backend we assume you have got stustapay core running with a database.

- To install the web ui requirements run
  ```shell
  cd web
  npm install
  ```

### Running
- To start the administration web interface run
  ```shell
  npx nx serve administration
  ```
- To start the customer portal web interface run
  ```shell
  npx nx serve customer-portal
  ```

## VS Code
When using DevContainer make sure to forward the port globally. Otherwise the till will not be able to connect.
In the VSCode Settings set Remote: Local Port Host to `allInterfaces`
![https://stackoverflow.com/a/67997839](https://i.stack.imgur.com/oM0zl.png)

Troubles with the database?
Connect to the database in the devcontainer pstgres-data (below dev volumes), then drop and re-create the schema.

1. `su -postgres -c psql`
2. `drop schema public cascade;`
3. `create schema public;`