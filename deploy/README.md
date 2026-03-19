# StuStaPay Azure deployment

This directory contains the configuration layout for the local Azure deployment tooling in [`tools/deploy/cli.sh`](/Users/thomastelaak/code/stustapay/tools/deploy/cli.sh).

## Setup

1. Copy [`common.env.example`](/Users/thomastelaak/code/stustapay/deploy/common.env.example) to `deploy/common.env`.
2. Copy the environment template you need:
   - [`primary.env.example`](/Users/thomastelaak/code/stustapay/deploy/environments/primary.env.example) to `deploy/environments/primary.env`
   - [`weu.env.example`](/Users/thomastelaak/code/stustapay/deploy/environments/weu.env.example) to `deploy/environments/weu.env`
3. Fill in Azure, VM, TLS, database and secret values.
4. Log into Azure locally with an account that can upload to the configured storage account.
5. Ensure the remote VM user has passwordless `sudo`, `python3`, `python3-venv`, `nginx` and `systemd`.

## Commands

Run all commands from the repository root:

```bash
tools/deploy/cli.sh dry-run --env primary
tools/deploy/cli.sh bootstrap-server --env primary
tools/deploy/cli.sh deploy --env primary
tools/deploy/cli.sh list-releases --env primary
tools/deploy/cli.sh rollback --env primary --release 20260315123000-deadbee
```

Deploying to the warm-standby environment works the same way with `--env weu`.

## Notes

- `deploy` uploads both web apps to Azure Blob Storage and installs one backend release on the target VM.
- The VM stores every release under `/opt/stustapay/releases/<release>` by default and switches `/opt/stustapay/current` on success.
- Rollback restores the stored config and nginx files from the selected release directory. It does not run database down-migrations.
- The nginx setup assumes one certificate/key pair is valid for the admin, customer portal and terminal domains of an environment.
- Azure Blob proxying can use a public container or a SAS token via `AZURE_STORAGE_SAS_TOKEN`.
