# StuStaPay Agent Workflow

This repository includes a small, repo-local workflow stack for Codex-style development under `.agents/`.

## Skills

- `stustapay-intake`: turn a request into an impact map, acceptance criteria, and required validation commands.
- `stustapay-build`: implement or debug the change using the stable repo commands.
- `stustapay-contract-sync`: regenerate backend OpenAPI specs and downstream web/Android clients.
- `stustapay-android-screen-capture`: capture current Android UI screens from a real device or emulator when live UI evidence matters.
- `stustapay-review`: run a production-focused review with contract, config, and generated-artifact checks.
- `stustapay-qa`: record executed validation plus browser QA and device-only follow-up.
- `stustapay-ship`: produce the final readiness summary, including commands run and remaining manual follow-up.

## Bootstrap Workflow

- Default entrypoint:
  - `python3 .agents/scripts/workflow_bootstrap.py --stage <intake|review|qa|ship> --output <text|json|markdown>`
- Add `--files <paths...>` before edits exist when you want to plan against candidate touch points.
- Once edits exist, omit `--files` so the current git working tree drives surface detection.
- Narrow the git view only when needed:
  - `--scope all` includes staged, unstaged, and untracked files.
  - `--scope staged` uses staged changes only.
  - `--scope unstaged` uses unstaged plus untracked files.
- Add `--write-state` to write the rendered scaffold into the matching `.agents/state/*.md` file.

## Low-Level Helpers

- `python3 .agents/scripts/changed_surfaces.py --files <paths...> --output json`
  - Summarizes which StuStaPay surfaces are affected.
- `python3 .agents/scripts/required_checks.py --files <paths...> --output json`
  - Maps changed paths to the stable repo validation commands.

## Stable Commands

- `make verify-backend`
- `make verify-web-administration`
- `make verify-web-customerportal`
- `make verify-android`
- `make sync-contract`

`make sync-contract` runs the full contract propagation chain:

1. `make generate-openapi`
2. `cd web && npx nx run administration:generate-openapi`
3. `cd web && npx nx run customerportal:generate-openapi`
4. `cd app && ./gradlew api`

## Durable Handoff Artifacts

Use the gitignored files under `.agents/state/` when a task needs durable context across multiple turns:

- `plan.md` for intake
- `review.md` for review-only or final review work
- `qa.md` for validation status and manual follow-up
- `ship.md` for release-ready summaries and rollout notes

Start from the matching template in `.agents/templates/`.

## Implementation Flow

1. Use `stustapay-intake` and `workflow_bootstrap.py --stage intake` to determine affected surfaces and checks.
2. Implement with `stustapay-build`.
3. If API contracts changed, run `stustapay-contract-sync`.
4. If Android UI evidence matters, use `stustapay-android-screen-capture`.
5. Validate with `stustapay-qa`.
6. Finish with `stustapay-ship`.

## Review-Only Flow

1. Use `stustapay-review`.
2. Generate `.agents/state/review.md` with `workflow_bootstrap.py --stage review --write-state` when the review spans multiple turns or needs a durable artifact.
3. Keep findings first and generated-artifact notes separate from handwritten-code findings.

Keep generated diffs separate from handwritten changes in your review summary whenever contract propagation is involved.
