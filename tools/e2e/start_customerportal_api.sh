#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

export STUSTAPAY_CONFIG="${STUSTAPAY_CONFIG:-etc/config.e2e.yaml}"

uv run python tools/e2e/seed_customerportal.py
exec uv run stustapay -c "$STUSTAPAY_CONFIG" customerportal-api
