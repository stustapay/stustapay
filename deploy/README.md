# StuStaPay local production deployment

The local deployment command builds both web applications, updates the existing backend Git checkout in place, runs database migrations, restarts the backend services, and overwrites the live Azure Blob paths.

## Setup

1. Copy `deploy/common.env.example` to `deploy/common.env`.
2. Copy `deploy/environments/primary.env.example` to `deploy/environments/primary.env`.
3. Fill in the Azure subscription, SSH host/key, and public smoke-test URLs.
4. Log into Azure locally with an account that can upload and download blobs in the configured container.
5. Ensure the SSH user has passwordless sudo for Git, switching to the backend runtime user, and controlling the configured systemd services.

The `.env` files are ignored by Git. Never store Azure keys, SAS tokens, SSH private keys, or backend credentials in tracked files.

## Commands

Run commands from the repository root:

```bash
tools/deploy/cli.sh dry-run --env primary
tools/deploy/cli.sh deploy --env primary
tools/deploy/cli.sh deploy --env primary --yes
tools/deploy/test.sh
```

`dry-run` validates the clean local branch and pushed commit, Azure access, SSH/sudo access, the remote checkout, virtual environment, config file, and all configured services. It does not build, upload, pull, migrate, or restart anything.

`deploy` repeats the preflight, builds both web applications without the Nx cache, displays the resolved production target, and requires confirmation. `--yes` skips only that confirmation and is intended for an already reviewed non-interactive run.

`tools/deploy/test.sh` runs isolated command and recovery tests with mocked Git, systemd, SSH, and Azure commands. It never connects to production.

## Deployment behavior

- The local checkout must be clean, on the configured branch, and exactly match `origin/<branch>`.
- The remote checkout must also be clean and on the configured branch.
- All backend services stop before the fast-forward-only pull, editable dependency installation, and migration.
- The remote commit must exactly match the validated local commit before migration starts.
- After the backend is healthy, the web builds overwrite `dist/apps/administration` and `dist/apps/customerportal` in the configured container. Existing unrelated or stale blobs are not deleted.
- Both uploaded `index.html` files are downloaded and compared with the local builds. Every referenced JavaScript bundle must exist before public smoke checks run.

## Failure boundary

Before migration begins, a failure restores the previous clean Git commit, reinstalls its dependencies, and restarts the services. Once migration starts, the command never rewinds Git or the database automatically.

If migration fails, services remain stopped and the command prints their state. If service startup, Azure upload, or a public smoke check fails after migration, the new backend remains installed and the command reports the deployed commit, service state, and which frontend uploads were verified. Resolve that state explicitly; there are no automatic database down-migrations.
