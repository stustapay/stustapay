---
name: stustapay-build
description: Use when implementing or debugging StuStaPay changes after intake. Covers backend, web, Android, config, and generated-artifact workflows, with validation chosen from the repo-local verification commands.
---

# StuStaPay Build

Use this skill for day-to-day production work after `stustapay-intake`.

## Start

- Read `.agents/state/plan.md` if it exists.
- Refresh the current surface and check picture before deciding what to run:
  - `python3 .agents/scripts/workflow_bootstrap.py --stage intake --output text`
- Prefer the stable repo entrypoints over ad hoc commands:
  - `make dev`
  - `make dev-backend`
  - `make dev-web`
  - `make verify-backend`
  - `make verify-web-administration`
  - `make verify-web-customerportal`
  - `make verify-android`
  - `make sync-contract`

## Surface rules

- Backend source of truth lives under `stustapay/`.
- Web source of truth lives under `web/apps/` and `web/libs/`; shared library changes imply both web apps.
- Android source of truth lives under `app/app`, `app/libssp`, `app/chip_debug`, and generated client code under `app/api`.
- Deployment and runtime config source of truth lives under `etc/`, `deploy/`, `docker/`, `pretix/`, `debian/`, and `server_*.yaml`.
- CI and developer workflow source of truth lives under `.github/`, `.agents/`, `tools/`, `Makefile`, and the Nix files.
- Treat generated code as downstream of handwritten backend contract changes; do not hand-edit generated clients as the primary fix.

## When to branch into other skills

- Switch to `stustapay-contract-sync` if endpoint or schema changes affect OpenAPI or generated clients.
- Switch to `stustapay-android-screen-capture` when Android implementation work depends on the current rendered UI, emulator/device screenshots, or Pencil-ready captures of live screens.
- Switch to `stustapay-review` for a review-only request; this path can stop at `.agents/state/review.md` without going through build, QA, and ship.
- Switch to `stustapay-qa` once code is ready for browser, API, or device validation, and write `.agents/state/qa.md` when the validation record should persist across turns.
