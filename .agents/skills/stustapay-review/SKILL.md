---
name: stustapay-review
description: Use for StuStaPay code review. Focus on regressions, missing tests, contract propagation, generated artifacts, config drift, and cross-surface risks across backend, web, Android, and packaging.
---

# StuStaPay Review

Default to a bug-finding review, not a style pass.

## Review checklist

- Does the changed behavior have tests or an explicit reason it cannot?
- If backend contract behavior changed, were backend specs and downstream clients regenerated where needed?
- If `web/libs/` changed, were both web applications considered?
- If Android flows changed, is there enough Gradle coverage and a manual device-test note for NFC, SumUp, or terminal flows?
- If config, deploy, Docker, Pretix, nginx, Debian, CI, or release tooling changed, are operational follow-ups documented?

## Output

- Put findings first, ordered by severity.
- Keep generated-artifact findings separate from handwritten-code findings.
- Update `.agents/state/review.md` for larger reviews or multi-step handoffs.
