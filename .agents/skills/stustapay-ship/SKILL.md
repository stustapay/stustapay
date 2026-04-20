---
name: stustapay-ship
description: Use when a StuStaPay change is near completion and you need final readiness, PR summary material, generated-artifact accounting, docs drift checks, and explicit manual follow-up notes.
---

# StuStaPay Ship

Use this skill for the last pass before handing work back.

## Start

- Prefer the stage bootstrap when the release summary or follow-up list should be durable:
  - `python3 .agents/scripts/workflow_bootstrap.py --stage ship --output markdown --write-state`

## Ship gate

- Confirm the right verification commands ran for every touched surface.
- Confirm generated artifacts are either intentionally present or intentionally absent.
- Confirm docs and AGENTS guidance were updated if the developer workflow changed.
- Confirm config, deploy, CI, Pretix, and packaging follow-ups are called out when code changes alone are not enough.

## Output

- Produce a concise summary of user-visible behavior and touched surfaces.
- List the commands that ran and the ones that could not run.
- Call out manual follow-up for browser QA, device testing, deploy steps, or secret/config rollout.
- Update `.agents/state/ship.md` when the task spans multiple turns or needs a durable handoff.
