---
name: stustapay-intake
description: Use when a StuStaPay task starts and you need to turn the request into an impact map, acceptance criteria, affected surfaces, and a concrete validation plan across backend, web, Android, config, and generated artifacts.
---

# StuStaPay Intake

Use this skill first for non-trivial StuStaPay work.

## Workflow

1. Inspect the request and current repo state.
2. Prefer the stage bootstrap as the default entrypoint:
   - `python3 .agents/scripts/workflow_bootstrap.py --stage intake --output markdown`
3. Before edits exist, pass candidate paths with `--files <paths...>` to plan against likely touch points.
4. After edits start, rerun intake from git without `--files` so the current working tree drives surfaces and checks.
5. Use `--scope staged` or `--scope unstaged` when you intentionally want a narrower git view.
6. Add `--write-state` when the task is large enough to benefit from a durable `.agents/state/plan.md` handoff.
7. Use the low-level helpers directly only when you need machine-readable building blocks:
   - `python3 .agents/scripts/changed_surfaces.py --output json`
   - `python3 .agents/scripts/required_checks.py --output json`

## What to lock down

- Goal and acceptance criteria
- Whether backend contract changes are in scope
- Whether generated artifacts are expected
- Which of `verify-backend`, `verify-web-*`, `verify-android`, and `sync-contract` must run

## Escalate early

- If the task touches `stustapay/administration`, `stustapay/customer_portal`, `stustapay/terminalserver`, `api/`, `web/.../generated`, or `app/api/`, treat contract propagation as a first-class concern.
- If a diff touches `web/libs/`, verify both web applications.
- If shared web config such as `web/tsconfig.base.json` or `web/.eslintrc.json` changes, verify both web applications.
- If Android touches NFC, SumUp, or terminal flows, call out manual device validation explicitly.
