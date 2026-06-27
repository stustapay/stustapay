# Repository Guidelines

## Project Structure & Module Organization
- Python backend lives in `stustapay/` (core logic, administration, terminalserver, customer_portal, ticket_shop, payment, bon generation, festival simulator, DSFinV-K export, TSE integration, and CLI entrypoints) with entrypoint `stustapay/__main__.py`.
- Tests sit under `stustapay/tests/`; shared fixtures are in `stustapay/tests/conftest.py`.
- Config templates and defaults live under `etc/` plus the top-level `server_*.yaml`; API specs are generated into `api/`.
- Assets/logos live in `assets/`; build and local-dev tooling lives in `tools/`; deployment manifests live in `docker/` and `debian/`.
- Frontends: `app/` holds the Android POS terminal plus generated API client modules; `web/` contains the customer portal, administration portal, and shared Nx libraries under `web/libs/`.
- Docs live in `docs/`; CI lives in `.github/workflows/`; top-level `Makefile` drives common tasks.

## Build, Test, and Development Commands
- `make test` — runs `pytest` with doctests and coverage against `stustapay`.
- `make lint` — runs `ruff`, `pylint`, and `mypy` checks; use `make ruff-fix` for autofixes.
- `make format` / `make check-format` — format with Ruff or verify formatting.
- `uv run stustapay -c config.yaml administration-api` — example service entrypoint; adjust command for `customerportal-api` or `terminalserver-api`.
- `npx nx serve customerportal` or `npx nx serve administration` in the `web` subfolder starts the dev loop for the frontend
- `npx nx e2e customerportal-e2e` in the `web` subfolder runs customer portal Playwright e2e tests (requires test Postgres from `docker compose -f docker/docker-compose.devel.yaml up -d postgres_test`)
- `make generate-openapi` — regenerate `api/*.json` from the configured services.
- `make sync-contract` — regenerate backend OpenAPI specs plus web and Android generated clients.
- `uv run sftkit create-migration <migration-name>` to create a new database migration. Don't forget to update the new `CURRENT_REVISION` in `stustapay/core/database.py`.

## Testing Guidelines
- Framework: `pytest` with asyncio support; coverage source is `stustapay`.
- Name tests `test_*.py` and `test_*` functions; place shared helpers in `stustapay/tests/common.py`.
- Use `make test` before pushing; include async tests where appropriate and prefer fixture-backed data over ad-hoc mocks.
- Add targeted tests for new branches; keep coverage similar or higher for touched areas.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes seen in history (e.g., `feat:`, `fix:`, `chore:`); write imperative summaries: `feat: add terminalserver health endpoint`.
- Scope commits narrowly; keep config and code changes separate when possible.

## Security & Configuration Tips
- Do not commit secrets; keep credentials and keys out of `etc/*.yaml` and API spec outputs.
- Use the provided sample configs as templates; document any new environment variables in PR descriptions.
- When regenerating OpenAPI files, review diffs for unintended surface changes before committing.
