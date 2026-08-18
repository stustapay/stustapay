#!/usr/bin/env bash

set -Eeuo pipefail

MODE="${1:?mode required}"
REMOTE_SUDO="${2:?sudo command required}"
BACKEND_REPO_DIR="${3:?backend repository required}"
BACKEND_BRANCH="${4:?backend branch required}"
EXPECTED_COMMIT="${5:-}"
BACKEND_VENV_DIR="${6:?backend virtual environment required}"
BACKEND_RUN_USER="${7:?backend runtime user required}"
BACKEND_CONFIG_PATH="${8:?backend config path required}"
BACKEND_SERVICES="${9:?backend services required}"

read -r -a SUDO <<<"$REMOTE_SUDO"
read -r -a SERVICES <<<"$BACKEND_SERVICES"
GIT=("${SUDO[@]}" -n git -c "safe.directory=${BACKEND_REPO_DIR}" -C "$BACKEND_REPO_DIR")
PYTHON="${BACKEND_VENV_DIR}/bin/python3"
PREVIOUS_COMMIT=""
PHASE="preflight"

remote_log() {
  printf '[remote-deploy] %s\n' "$*"
}

remote_error() {
  printf '[remote-deploy] ERROR: %s\n' "$*" >&2
}

service_status() {
  local unit state
  for unit in "${SERVICES[@]}"; do
    state="$(systemctl is-active "$unit" 2>/dev/null || true)"
    printf 'DEPLOY_SERVICE unit=%s state=%s\n' "$unit" "${state:-unknown}"
  done
}

install_backend() {
  local metadata_dir
  "${SUDO[@]}" -n chown -R "${BACKEND_RUN_USER}:" "$BACKEND_VENV_DIR"
  for metadata_dir in "$BACKEND_REPO_DIR"/*.egg-info; do
    [[ -d "$metadata_dir" ]] || continue
    "${SUDO[@]}" -n chown -R "${BACKEND_RUN_USER}:" "$metadata_dir"
  done
  "${SUDO[@]}" -n -u "$BACKEND_RUN_USER" "$PYTHON" -m pip install --disable-pip-version-check -e "$BACKEND_REPO_DIR"
}

recover_before_migration() {
  local recovery_status=0
  [[ -n "$PREVIOUS_COMMIT" ]] || return 0
  remote_error "Failure before migration; restoring ${PREVIOUS_COMMIT}"
  "${GIT[@]}" reset --hard "$PREVIOUS_COMMIT" || recovery_status=1
  install_backend || recovery_status=1
  "${SUDO[@]}" -n systemctl start "${SERVICES[@]}" || recovery_status=1
  "${SUDO[@]}" -n systemctl is-active "${SERVICES[@]}" >/dev/null || recovery_status=1
  if [[ "$recovery_status" -eq 0 ]]; then
    remote_log "Previous backend revision restored and services restarted"
  else
    remote_error "Automatic recovery was incomplete"
  fi
  service_status
}

on_error() {
  local status=$?
  trap - ERR
  remote_error "Deployment failed during phase=${PHASE} status=${status}"
  case "$PHASE" in
    stopping|pulling|installing)
      recover_before_migration
      ;;
    starting|health)
      "${SUDO[@]}" -n systemctl start "${SERVICES[@]}" >/dev/null 2>&1 || true
      service_status
      ;;
    migrating)
      remote_error "Migration began; code and database were not rewound and services remain stopped"
      service_status
      ;;
  esac
  exit "$status"
}

preflight() {
  local status branch unit
  command -v git >/dev/null
  command -v systemctl >/dev/null
  command -v chown >/dev/null
  "${SUDO[@]}" -n true
  "${SUDO[@]}" -n -u "$BACKEND_RUN_USER" true
  [[ -d "$BACKEND_REPO_DIR/.git" ]]
  [[ -x "$PYTHON" ]]
  [[ -f "$BACKEND_CONFIG_PATH" ]]
  "${SUDO[@]}" -n -u "$BACKEND_RUN_USER" test -w "$BACKEND_VENV_DIR"
  "${SUDO[@]}" -n -u "$BACKEND_RUN_USER" "$PYTHON" -m pip --version >/dev/null
  status="$("${GIT[@]}" status --porcelain)"
  [[ -z "$status" ]] || {
    remote_error "Backend checkout is dirty"
    exit 1
  }
  branch="$("${GIT[@]}" branch --show-current)"
  [[ "$branch" == "$BACKEND_BRANCH" ]] || {
    remote_error "Backend branch is ${branch:-detached}; expected ${BACKEND_BRANCH}"
    exit 1
  }
  "${GIT[@]}" remote get-url origin >/dev/null
  "${GIT[@]}" ls-remote --exit-code origin "refs/heads/${BACKEND_BRANCH}" >/dev/null
  for unit in "${SERVICES[@]}"; do
    systemctl cat "$unit" >/dev/null
  done
  printf 'DEPLOY_PREFLIGHT branch=%s commit=%s services=%s\n' \
    "$branch" "$("${GIT[@]}" rev-parse HEAD)" "${#SERVICES[@]}"
}

deploy() {
  trap on_error ERR
  preflight
  PREVIOUS_COMMIT="$("${GIT[@]}" rev-parse HEAD)"

  PHASE="stopping"
  remote_log "Stopping ${#SERVICES[@]} backend services"
  "${SUDO[@]}" -n systemctl stop "${SERVICES[@]}"

  PHASE="pulling"
  remote_log "Fast-forwarding ${BACKEND_BRANCH}"
  "${GIT[@]}" pull --ff-only origin "$BACKEND_BRANCH"
  [[ "$("${GIT[@]}" rev-parse HEAD)" == "$EXPECTED_COMMIT" ]] || {
    remote_error "Remote commit does not match expected commit ${EXPECTED_COMMIT}"
    false
  }

  PHASE="installing"
  remote_log "Updating editable backend installation and dependencies"
  install_backend

  PHASE="migrating"
  remote_log "Applying database migrations"
  "${SUDO[@]}" -n -u "$BACKEND_RUN_USER" "$PYTHON" -m stustapay -c "$BACKEND_CONFIG_PATH" db migrate

  PHASE="starting"
  remote_log "Starting backend services"
  "${SUDO[@]}" -n systemctl start "${SERVICES[@]}"

  PHASE="health"
  "${SUDO[@]}" -n systemctl is-active "${SERVICES[@]}" >/dev/null
  trap - ERR
  printf 'DEPLOY_RESULT commit=%s migration=complete services=active\n' "$EXPECTED_COMMIT"
  service_status
}

case "$MODE" in
  preflight)
    preflight
    ;;
  deploy)
    [[ -n "$EXPECTED_COMMIT" ]] || {
      remote_error "Expected commit is required for deployment"
      exit 1
    }
    deploy
    ;;
  status)
    printf 'DEPLOY_STATUS commit=%s branch=%s\n' \
      "$("${GIT[@]}" rev-parse HEAD 2>/dev/null || printf unknown)" \
      "$("${GIT[@]}" branch --show-current 2>/dev/null || printf unknown)"
    service_status
    ;;
  *)
    remote_error "Unknown mode: ${MODE}"
    exit 1
    ;;
esac
