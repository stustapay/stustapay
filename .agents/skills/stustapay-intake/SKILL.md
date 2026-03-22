---
name: stustapay-intake
description: Use when a StuStaPay task starts and you need to turn the request into an impact map, acceptance criteria, affected surfaces, and a concrete validation plan across backend, web, Android, config, and generated artifacts.
---

# StuStaPay Intake

Use this skill first for non-trivial StuStaPay work.

## Workflow

1. Inspect the request and current repo state.
2. Summarize affected surfaces with:
   - `python3 .agents/scripts/changed_surfaces.py --files <paths...> --output json`
3. Turn the surface report into required checks with:
   - `python3 .agents/scripts/required_checks.py --files <paths...> --output json`
4. Write or update `.agents/state/plan.md` from `.agents/templates/plan.md` when the task is large enough to benefit from a persistent handoff.

## What to lock down

- Goal and acceptance criteria
- Whether backend contract changes are in scope
- Whether generated artifacts are expected
- Which of `verify-backend`, `verify-web-*`, `verify-android`, and `sync-contract` must run

## Escalate early

- If the task touches `stustapay/administration`, `stustapay/customer_portal`, `stustapay/terminalserver`, `api/`, `web/.../generated`, or `app/api/`, treat contract propagation as a first-class concern.
- If a diff touches `web/libs/`, verify both web applications.
- If Android touches NFC, SumUp, or terminal flows, call out manual device validation explicitly.
