#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/stustapay-deploy-tests-XXXXXX")"
trap 'rm -rf "$TEST_ROOT"' EXIT

PASS_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '[deploy-test] PASS: %s\n' "$1"
}

expect_success() {
  local name="$1" output
  shift
  output="${TEST_ROOT}/last-output"
  "$@" >"$output" 2>&1 || {
    printf '[deploy-test] FAIL: %s (expected success)\n' "$name" >&2
    sed 's/^/[deploy-test]   /' "$output" >&2
    return 1
  }
  pass "$name"
}

expect_failure() {
  local name="$1" output
  shift
  output="${TEST_ROOT}/last-output"
  if "$@" >"$output" 2>&1; then
    printf '[deploy-test] FAIL: %s (expected failure)\n' "$name" >&2
    sed 's/^/[deploy-test]   /' "$output" >&2
    return 1
  fi
  pass "$name"
}

FAKE_BIN="${TEST_ROOT}/bin"
mkdir -p "$FAKE_BIN"

cat >"${FAKE_BIN}/sudo" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
while [[ "${1:-}" == "-n" || "${1:-}" == "-u" ]]; do
  if [[ "$1" == "-u" ]]; then shift 2; else shift; fi
done
if [[ "${1:-}" == "true" || "${1:-}" == "chown" || "${1:-}" == "test" ]]; then exit 0; fi
exec "$@"
EOF

cat >"${FAKE_BIN}/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
args=" $* "
case "$args" in
  *" status --porcelain "*)
    if [[ "${SCENARIO:-}" == "dirty" ]]; then printf ' M dirty\n'; fi
    ;;
  *" branch --show-current "*)
    if [[ "${SCENARIO:-}" == "wrong_branch" ]]; then printf 'other\n'; else printf '%s\n' "${EXPECTED_BRANCH:-merge-current-state-2}"; fi
    ;;
  *" rev-parse HEAD "*) cat "$STATE_FILE";;
  *" rev-parse origin/"*) printf '%s\n' "${EXPECTED_SHA:-newsha}";;
  *" fetch "*) exit 0;;
  *" pull --ff-only "*)
    if [[ "${SCENARIO:-}" == "non_fast_forward" ]]; then exit 1; fi
    if [[ "${SCENARIO:-}" == "sha_mismatch" ]]; then
      printf 'wrongsha\n' >"$STATE_FILE"
    else
      printf '%s\n' "${EXPECTED_SHA:-newsha}" >"$STATE_FILE"
    fi
    ;;
  *" reset --hard "*)
    previous="${args##* reset --hard }"
    printf '%s\n' "${previous%% *}" >"$STATE_FILE"
    ;;
  *" remote -v "*) exit 0;;
  *) exit 0;;
esac
EOF

cat >"${FAKE_BIN}/systemctl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$SERVICE_LOG"
case "${1:-}" in
  cat|stop) exit 0;;
  start) [[ "${SCENARIO:-}" == "service_failure" ]] && exit 1 || exit 0;;
  is-active) [[ "${SCENARIO:-}" == "service_failure" ]] && exit 1 || { printf 'active\n'; exit 0; };;
  *) exit 0;;
esac
EOF

cat >"${FAKE_BIN}/az" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ " $* " == *" storage container exists "* || " $* " == *" storage blob exists "* ]]; then
  printf 'true\n'
fi
EOF

cat >"${FAKE_BIN}/ssh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cat >/dev/null
printf 'DEPLOY_PREFLIGHT branch=merge-current-state-2 commit=oldsha services=4\n'
EOF

chmod +x "${FAKE_BIN}"/*

REMOTE_ROOT="${TEST_ROOT}/remote"
mkdir -p "${REMOTE_ROOT}/repo/.git" "${REMOTE_ROOT}/repo/stustapay.egg-info" "${REMOTE_ROOT}/venv/bin"
touch "${REMOTE_ROOT}/config.yaml"

cat >"${REMOTE_ROOT}/venv/bin/python3" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
args=" $* "
if [[ "$args" == *" -m pip install "* && "${SCENARIO:-}" == "dependency_failure" ]]; then exit 1; fi
if [[ "$args" == *" db migrate "* && "${SCENARIO:-}" == "migration_failure" ]]; then exit 1; fi
exit 0
EOF
chmod +x "${REMOTE_ROOT}/venv/bin/python3"

run_remote() {
  local scenario="$1" mode="$2"
  printf 'oldsha\n' >"${TEST_ROOT}/state"
  : >"${TEST_ROOT}/services.log"
  PATH="${FAKE_BIN}:$PATH" \
    SCENARIO="$scenario" \
    STATE_FILE="${TEST_ROOT}/state" \
    SERVICE_LOG="${TEST_ROOT}/services.log" \
    EXPECTED_SHA="newsha" \
    EXPECTED_BRANCH="merge-current-state-2" \
    bash "${SCRIPT_DIR}/remote-deploy.sh" "$mode" sudo "${REMOTE_ROOT}/repo" merge-current-state-2 newsha \
      "${REMOTE_ROOT}/venv" cashless "${REMOTE_ROOT}/config.yaml" 'svc-a.service svc-b.service'
}

assert_recovered() {
  local scenario="$1"
  run_remote "$scenario" deploy >/dev/null 2>&1 && return 1
  [[ "$(<"${TEST_ROOT}/state")" == "oldsha" ]]
  grep -q '^start svc-a.service svc-b.service$' "${TEST_ROOT}/services.log"
}

assert_migration_not_rewound() {
  run_remote migration_failure deploy >/dev/null 2>&1 && return 1
  [[ "$(<"${TEST_ROOT}/state")" == "newsha" ]]
  ! grep -q '^start ' "${TEST_ROOT}/services.log"
}

assert_service_failure_keeps_new_commit() {
  run_remote service_failure deploy >/dev/null 2>&1 && return 1
  [[ "$(<"${TEST_ROOT}/state")" == "newsha" ]]
}

expect_success 'remote preflight' run_remote success preflight
expect_failure 'dirty remote checkout' run_remote dirty preflight
expect_failure 'wrong remote branch' run_remote wrong_branch preflight
expect_success 'non-fast-forward recovery' assert_recovered non_fast_forward
expect_success 'commit mismatch recovery' assert_recovered sha_mismatch
expect_success 'dependency failure recovery' assert_recovered dependency_failure
expect_success 'migration failure is not rewound' assert_migration_not_rewound
expect_success 'service failure keeps migrated commit' assert_service_failure_keeps_new_commit
expect_success 'successful remote deployment' run_remote success deploy

CONFIG_ROOT="${TEST_ROOT}/config"
mkdir -p "${CONFIG_ROOT}/environments"
cat >"${CONFIG_ROOT}/common.env" <<EOF
AZURE_SUBSCRIPTION_ID=test-subscription
AZURE_STORAGE_AUTH_MODE=login
SSH_PORT=22
REMOTE_SUDO=sudo
BACKEND_REPO_DIR=${REMOTE_ROOT}/repo
BACKEND_VENV_DIR=${REMOTE_ROOT}/venv
BACKEND_RUN_USER=cashless
BACKEND_CONFIG_PATH=${REMOTE_ROOT}/config.yaml
BACKEND_SERVICES='svc-a.service svc-b.service'
EOF
cat >"${CONFIG_ROOT}/environments/primary.env" <<'EOF'
VM_HOST=backend.example
SSH_USER=deploy
BACKEND_BRANCH=merge-current-state-2
AZURE_STORAGE_ACCOUNT=teststorage
AZURE_STORAGE_CONTAINER=shared
EOF

run_cli() {
  printf 'newsha\n' >"${TEST_ROOT}/state"
  PATH="${FAKE_BIN}:$PATH" \
    DEPLOY_CONFIG_ROOT="$CONFIG_ROOT" \
    STATE_FILE="${TEST_ROOT}/state" \
    SERVICE_LOG="${TEST_ROOT}/services.log" \
    EXPECTED_SHA="newsha" \
    EXPECTED_BRANCH="merge-current-state-2" \
    "${SCRIPT_DIR}/cli.sh" "$@"
}

expect_success 'CLI help' "${SCRIPT_DIR}/cli.sh" --help
expect_failure 'missing environment argument' "${SCRIPT_DIR}/cli.sh" dry-run
expect_failure 'unknown command' "${SCRIPT_DIR}/cli.sh" obsolete --env primary
expect_failure 'unknown option' "${SCRIPT_DIR}/cli.sh" dry-run --env primary --release old
expect_failure '--yes rejected for dry-run' "${SCRIPT_DIR}/cli.sh" dry-run --env primary --yes
expect_success 'mocked successful dry-run' run_cli dry-run --env primary

expect_failure 'interactive confirmation blocks without terminal' \
  bash -c "source '${SCRIPT_DIR}/lib.sh'; DEPLOY_ENV_NAME=primary; confirm_deploy false" </dev/null
expect_success '--yes bypasses only confirmation' \
  bash -c "source '${SCRIPT_DIR}/lib.sh'; DEPLOY_ENV_NAME=primary; confirm_deploy true"

AZURE_FAIL_BIN="${TEST_ROOT}/azure-fail-bin"
mkdir -p "$AZURE_FAIL_BIN" "${TEST_ROOT}/web"
cat >"${AZURE_FAIL_BIN}/az" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
output_file=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--file" ]]; then output_file="$2"; shift 2; else shift; fi
done
printf '<html>mismatch</html>\n' >"$output_file"
EOF
chmod +x "${AZURE_FAIL_BIN}/az"
printf '<script src="main-good.js"></script>\n' >"${TEST_ROOT}/web/index.html"
expect_failure 'Azure index verification mismatch' \
  bash -c "source '${SCRIPT_DIR}/lib.sh'; AZURE_STORAGE_ARGS=(--auth-mode login --account-name test); AZURE_STORAGE_CONTAINER=shared; PATH='${AZURE_FAIL_BIN}':\$PATH; verify_uploaded_app '${TEST_ROOT}/web' dist/apps/administration administration"

AZURE_OK_BIN="${TEST_ROOT}/azure-ok-bin"
mkdir -p "$AZURE_OK_BIN"
cat >"${AZURE_OK_BIN}/az" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ " $* " == *" storage blob exists "* ]]; then
  printf 'true\n'
  exit 0
fi
output_file=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--file" ]]; then output_file="$2"; shift 2; else shift; fi
done
cp "$AZURE_SOURCE_INDEX" "$output_file"
EOF
chmod +x "${AZURE_OK_BIN}/az"
expect_success 'Azure index and bundle verification' \
  bash -c "source '${SCRIPT_DIR}/lib.sh'; AZURE_STORAGE_ARGS=(--auth-mode login --account-name test); AZURE_STORAGE_CONTAINER=shared; AZURE_SOURCE_INDEX='${TEST_ROOT}/web/index.html'; export AZURE_SOURCE_INDEX; PATH='${AZURE_OK_BIN}':\$PATH; verify_uploaded_app '${TEST_ROOT}/web' dist/apps/administration administration"

printf '[deploy-test] %s checks passed\n' "$PASS_COUNT"
