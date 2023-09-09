---
sidebar_position: 3
---

# Administrator Documentation

## Operating StuStaPay

### Getting a postgres shell

```shell
python -m stustapay -c server.yaml db attach
```

### Starting the individual API backends

- To run the administration backend run
  ```shell
  python -m stustapay -c server.yaml administration-api
  ```
  You can check out the api documentation at `http://localhost:8081/docs`, (port subject to change depending on your dev
  config)
- To run the terminal backend run
  ```shell
  python -m stustapay -c server.yaml terminalserver-api
  ```
  You can check out the api documentation at `http://localhost:8082/docs`, (port subject to change depending on your dev
  config)