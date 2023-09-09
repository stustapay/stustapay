# StuStaPay Simulator

## Setup

- Set up core
    - Follow instructions in [Installation](../administrator-documentation/installation/index.md) for setting up
      Postgres
    - But no need for the `rebuild` and `add_data` commands, this will be handled by the `festivalsimulator`
- Set up DB: `python3 -m stustapay -c server.yaml simulate setup`
    - Customize simulation parameters if necessary

## Simulate

- Start API in one terminal: `python3 -m stustapay -c server.yaml simulate api`
- Simulate in second terminal: `python3 -m stustapay -c server.yaml simulate start`