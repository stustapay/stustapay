---
name: stustapay-local-deployment
description: Run and assess the guarded StuStaPay production deployment from a local checkout. Use when Codex needs to validate deployment readiness, build and publish both web frontends to the established Azure Blob paths, fast-forward the configured backend server, apply database migrations, restart backend services, or report deployment failures and recovery state.
---

# StuStaPay Local Deployment

Use the repository deployment command as the only implementation of the rollout. Do not reproduce its Azure, SSH, Git, migration, or recovery commands manually.

## Validate readiness

1. Read `deploy/README.md` when setup or failure recovery is relevant.
2. Check the working tree and explain that deployment requires a clean, pushed commit on the configured branch.
3. Run:

   ```bash
   tools/deploy/cli.sh dry-run --env primary
   ```

4. Summarize the resolved branch, commit, host, Azure destination, and backend prerequisite result. Treat a dirty checkout, branch mismatch, unpushed commit, inaccessible Azure container, or failed remote prerequisite as blocking.

## Deploy production

Run a real deployment only when the user explicitly requests the production mutation. Always run the dry-run first in the same task and stop if it fails.

Prefer the interactive command when a person can confirm the displayed target:

```bash
tools/deploy/cli.sh deploy --env primary
```

Use `--yes` only when the user explicitly approved the exact resolved target and commit and the session cannot provide an interactive terminal. The flag bypasses only the confirmation; it must not bypass preflight or verification.

## Report the result

- On success, report the deployed commit, active backend services, verified administration and customer-portal uploads, and public smoke-check result.
- On a pre-migration failure, report whether the previous commit and services were restored.
- Once migration begins, never suggest that the command automatically rolled back code or data. Report the commit, migration phase, service states, and frontend upload states printed by the command.
- Never print values from ignored environment files, Azure keys, SAS tokens, SSH keys, database credentials, or backend application secrets.
