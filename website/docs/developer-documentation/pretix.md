---
sidebar_position: 3
---

# Pretix Integration

To run a dummy pretix instance simply run the following

```shell
cd <stustapay-repo-dir>/pretix
docker compose up
```

This will start a pretix instance together with a postgres database and a redis cache while
also automatically installing the sumup payment provider pretix plugin.

You can then go to `http://localhost:8000/control/login` and log in with username `admin@localhost` and password `admin`.

Follow the steps in the [Admin Docs](../administrator-documentation/pretix) to configure the Pretix integration.
Use `http://localhost:8000` as the pretix base url.
