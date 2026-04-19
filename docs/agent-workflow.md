# StuStaPay Agent Workflow

This repository includes a small, repo-local workflow stack for Codex-style development under `.agents/`.

## Skills

- `stustapay-intake`: turn a request into an impact map, acceptance criteria, and required validation commands.
- `stustapay-build`: implement or debug the change using the stable repo commands.
- `stustapay-contract-sync`: regenerate backend OpenAPI specs and downstream web/Android clients.
- `stustapay-review`: run a production-focused review with contract, config, and generated-artifact checks.
- `stustapay-qa`: record executed validation plus browser QA and device-only follow-up.
- `stustapay-ship`: produce the final readiness summary, including commands run and remaining manual follow-up.

## Helper Scripts

- `python3 .agents/scripts/changed_surfaces.py --files <paths...> --output json`
  - Summarizes which StuStaPay surfaces are affected.
- `python3 .agents/scripts/changed_surfaces.py --staged --output json`
  - Reads the staged diff directly when you already have a staged worktree.
- `python3 .agents/scripts/required_checks.py --files <paths...> --output json`
  - Maps changed paths to the stable repo validation commands.
- `python3 .agents/scripts/required_checks.py --from-git --output json`
  - Maps the current working tree diff to the stable repo validation commands.

## Stable Commands

- `make dev`
- `make dev-backend`
- `make dev-web`
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

- `plan.md`
- `review.md`
- `qa.md`
- `ship.md`

Start from the matching template in `.agents/templates/`.

## Typical Flow

1. Use `stustapay-intake` and the helper scripts to determine affected surfaces and checks.
2. Implement with `stustapay-build`.
3. If API contracts changed, run `stustapay-contract-sync`.
4. Validate with `stustapay-qa`.
5. Finish with `stustapay-ship`.

Keep generated diffs separate from handwritten changes in your review summary whenever contract propagation is involved.

The helper scripts and skills are expected to cover the current repo layout:

- backend code under `stustapay/`
- web applications under `web/apps/` and shared code under `web/libs/`
- Android app modules and generated client code under `app/`
- deployment and config under `etc/`, `deploy/`, `docker/`, `pretix/`, `debian/`, and `server_*.yaml`
- developer and CI workflow files under `.agents/`, `.github/workflows/`, `tools/`, `Makefile`, and the Nix files
