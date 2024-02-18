---
sidebar_position: 1
---
# Simulator

## Setup
Follow instructions in [Installation](./index.mdx) 
for setting up the general development environment.

Set up the simulation enviroment (customize parameters if needed)
```shell
python3 -m stustapay -c etc/config.devel.yaml simulate setup
```

## Simulate

- Start API in one terminal: `python3 -m stustapay -c etc/config.devel.yaml simulate api`
- Simulate in second terminal: `python3 -m stustapay -c etc/config.devel.yaml simulate start`