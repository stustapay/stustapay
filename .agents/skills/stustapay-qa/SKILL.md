---
name: stustapay-qa
description: Use when validating StuStaPay changes before shipping. Covers repo-local verification commands, browser QA for web, backend API smoke coverage, and Android manual validation notes for hardware-dependent flows.
---

# StuStaPay QA

Use this skill after implementation and before `stustapay-ship`.

## Validation order

1. Run the recommended repo commands for the touched surfaces.
2. For web changes, do browser QA on the real route or workflow that changed.
3. For backend-only changes, call out any missing integration smoke coverage explicitly.
4. For Android changes, pair Gradle checks with manual device notes if NFC, terminal registration, ticket scanning, or SumUp paths changed.

## Required artifacts

- Record executed commands and outcomes in `.agents/state/qa.md` for substantial changes.
- Record skipped checks with reasons.
- Record manual-only validation still pending.
