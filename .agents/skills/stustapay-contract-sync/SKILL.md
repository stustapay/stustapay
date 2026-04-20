---
name: stustapay-contract-sync
description: Use when StuStaPay backend API contracts or generated clients may have changed. Covers backend OpenAPI regeneration plus downstream web and Android client synchronization and review discipline.
---

# StuStaPay Contract Sync

Use this skill whenever HTTP contract behavior changes or generated artifacts are already in the diff.

## Start

- Refresh the current affected surfaces before regeneration when the scope is unclear:
  - `python3 .agents/scripts/workflow_bootstrap.py --stage intake --output text`

## Sync order

1. Regenerate backend specs with `make generate-openapi`.
2. Regenerate web consumers:
   - `cd web && npx nx run administration:generate-openapi`
   - `cd web && npx nx run customerportal:generate-openapi`
3. Regenerate the Android terminalserver client:
   - `cd app && ./gradlew api`

## Review rules

- Keep handwritten backend changes logically separate from generated diffs when summarizing the work.
- Do not declare the task done until real consumers have been updated or explicitly ruled out.
- After regeneration, re-run surface-specific verification commands for each affected consumer.
- If the task spans multiple turns, capture the downstream verification plan in `.agents/state/qa.md` or `.agents/state/ship.md`.

## Common triggers

- Changes under `stustapay/administration/`
- Changes under `stustapay/customer_portal/`
- Changes under `stustapay/terminalserver/`
- Changes under `api/`
- Changes under `web/apps/*/openapi-config.js`
- Changes under `web/apps/*/src/api/generated/`
- Changes under `app/api/`
- Changes under `app/api/build.gradle`, `app/build.gradle`, or `app/settings.gradle`
