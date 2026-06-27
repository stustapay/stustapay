---
sidebar_position: 2
---

# Customer Portal E2E Tests

The customer portal browser tests live in `web/apps/customerportal-e2e` and run against a real
`customerportal-api` with deterministic data seeded into the test Postgres database.

Follow the general [developer setup](./index.mdx) first, then complete the steps below.

## Prerequisites

1. Install web dependencies:

```shell
cd web
npm install
```

2. Install Playwright browsers:

```shell
npx playwright install chromium
```

3. Install Python dependencies from the repository root:

```shell
uv sync
```

4. Start the test Postgres instance:

```shell
docker compose -f docker/docker-compose.devel.yaml up -d postgres_test
```

## Running the tests

Run the full e2e suite from the `web` directory. Playwright starts the backend and frontend
automatically:

```shell
npm run e2e:customerportal
```

Or directly:

```shell
npx nx e2e customerportal-e2e
```

## Test data and configuration

Test credentials and bank data are defined in:

- `web/apps/customerportal-e2e/src/fixtures.ts`
- `tools/e2e/seed_customerportal.py`

The backend uses `etc/config.e2e.yaml` and connects to Postgres on `localhost:5434`.
Each run resets and reseeds the `stustapay_test` database before starting the API.
