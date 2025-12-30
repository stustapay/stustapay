# Repository Guidelines

## Project Structure & Module Organization
- Python backend lives in `stustapay/` (core logic, administration, terminalserver, customer_portal, ticket_shop, payment, TSE integration) with entrypoint `stustapay/__main__.py`.
- Tests sit under `stustapay/tests/`; shared fixtures are in `stustapay/tests/conftest.py`.
- Config templates and defaults: `etc/config.yaml`, `server_local.yaml`; API specs generated into `api/`.
- Assets/logos in `assets/`; build/deploy tooling in `tools/`, Debian packaging in `debian/`.
- Frontends: `app/` holds the Android POS terminal; `web/` contains the customer portal and administration portal.
- Docs live in `docs/`; top-level `Makefile` drives common tasks.

## Build, Test, and Development Commands
- `make test` — runs `pytest` with doctests and coverage against `stustapay`.
- `make lint` — runs `ruff`, `pylint`, and `mypy` checks; use `make ruff-fix` for autofixes.
- `make format` / `make check-format` — format with Ruff or verify formatting.
- `python3 -m stustapay -c etc/config.yaml terminalserver-api` — example service entrypoint; adjust command for `customerportal-api` or `administration-api`.
- `make generate-openapi` — regenerate `api/*.json` from the configured services.

## Coding Style & Naming Conventions
- Target Python 3.11; 4-space indent; max line length 120 (tool-enforced).
- Prefer typed functions; keep business logic in core modules and leave I/O at the edges.
- Module/file names use `snake_case`; classes `PascalCase`; functions/variables `snake_case`.
- Lint/format with Ruff; type-check with MyPy; PyLint is configured to ignore most style nitpicks but respect warnings/errors.

## Testing Guidelines
- Framework: `pytest` with asyncio support; coverage source is `stustapay`.
- Name tests `test_*.py` and `test_*` functions; place shared helpers in `stustapay/tests/common.py`.
- Use `make test` before pushing; include async tests where appropriate and prefer fixture-backed data over ad-hoc mocks.
- Add targeted tests for new branches; keep coverage similar or higher for touched areas.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes seen in history (e.g., `feat:`, `fix:`, `chore:`); write imperative summaries: `feat: add terminalserver health endpoint`.
- Scope commits narrowly; keep config and code changes separate when possible.
- PRs should include a short summary, linked issue/ticket, and test results (`make test` / `make lint`). Add screenshots for UI-facing changes (web/app) and mention config impacts (e.g., changes under `etc/`).

## Security & Configuration Tips
- Do not commit secrets; keep credentials and keys out of `etc/*.yaml` and API spec outputs.
- Use the provided sample configs as templates; document any new environment variables in PR descriptions.
- When regenerating OpenAPI files, review diffs for unintended surface changes before committing.
