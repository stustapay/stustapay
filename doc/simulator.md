# Setup
- Set up core
  - Follow instructions in [core.md](core.md) for setting up Postgres
  - But no need for the `rebuild` and `add_data` commands, this will be handled by the `festivalsimulator`
- Set up DB: `python3 -m stustapay.festivalsimulator -c server.yaml setup database`
  - Customize simulation parameters if necessary

# Simulate
- Start API in one terminal: `python3 -m stustapay.festivalsimulator -c server.yaml setup start-api`
- Simulate in second terminal: `python3 -m stustapay.festivalsimulator -c server.yaml simulate`