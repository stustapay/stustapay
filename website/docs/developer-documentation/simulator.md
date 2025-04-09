---
sidebar_position: 1
---

# Simulator

## Setup

Follow instructions in [Installation](./index.mdx)
for setting up the general development environment.

Set up the simulation environment (customize parameters if needed)

```shell
python3 -m stustapay -c etc/config.devel.yaml simulate setup
```

## Simulate

- Start API in one terminal: `python3 -m stustapay -c etc/config.devel.yaml simulate api --no-tse --no-bon`
- Simulate in second terminal: `python3 -m stustapay -c etc/config.devel.yaml -vvv simulate start`

## View Data

After the simulation has ran and the api is still running you can view the generated data in the admin and customer web frontends.
The web interfaces need to be running as shown in [Installation](./index.mdx).
You can log into the admin interface on [http://localhost:4200/](http://localhost:4200/) (default port config) with the following credentials:

```
username: global-admin
pw: admin
```

The customer portal can be accessed on [http://localhost:4300/](http://localhost:4300/) (default port config). You can lookup a generated pin in the admin frontend, [see this page](./index.mdx).
