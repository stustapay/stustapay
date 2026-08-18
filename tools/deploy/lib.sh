#!/usr/bin/env bash

set -euo pipefail

readonly DEPLOY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${DEPLOY_LIB_DIR}/../.." && pwd)"
readonly DEPLOY_ROOT="${DEPLOY_CONFIG_ROOT:-${REPO_ROOT}/deploy}"
readonly DEPLOY_ENV_DIR="${DEPLOY_ROOT}/environments"
readonly REMOTE_DEPLOY_SCRIPT="${DEPLOY_LIB_DIR}/remote-deploy.sh"

log() {
  printf '[deploy] %s\n' "$*"
}

warn() {
  printf '[deploy] WARN: %s\n' "$*" >&2
}

die() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

usage() {
  cat <<'EOF'
Usage:
  tools/deploy/cli.sh dry-run --env <target>
  tools/deploy/cli.sh deploy --env <target> [--yes]

Commands:
  dry-run            Validate Git, Azure, SSH and backend prerequisites without deploying
  deploy             Build the web apps and deploy the matching backend and frontends

Options:
  --env <target>     Load deploy/common.env and deploy/environments/<target>.env
  --yes              Skip the interactive production confirmation for deploy
  --help             Show this help
EOF
}

ssh_target() {
  printf '%s@%s' "$SSH_USER" "$VM_HOST"
}

declare -a SSH_BASE_ARGS
declare -a AZURE_STORAGE_ARGS
declare -a BACKEND_SERVICES_ARRAY

setup_args() {
  SSH_BASE_ARGS=(-o BatchMode=yes -o ConnectTimeout=10 -p "$SSH_PORT")
  if [[ -n "$SSH_PRIVATE_KEY" ]]; then
    SSH_BASE_ARGS+=(-i "$SSH_PRIVATE_KEY")
  fi

  AZURE_STORAGE_ARGS=(--account-name "$AZURE_STORAGE_ACCOUNT")
  if [[ -n "$AZURE_STORAGE_SAS_TOKEN" ]]; then
    AZURE_STORAGE_ARGS+=(--sas-token "$AZURE_STORAGE_SAS_TOKEN")
  else
    AZURE_STORAGE_ARGS+=(--auth-mode "$AZURE_STORAGE_AUTH_MODE")
  fi

  read -r -a BACKEND_SERVICES_ARRAY <<<"$BACKEND_SERVICES"
}

load_env() {
  local env_name="$1"
  local common_env="${DEPLOY_ROOT}/common.env"
  local target_env="${DEPLOY_ENV_DIR}/${env_name}.env"

  [[ -f "$common_env" ]] || die "Missing deploy config: ${common_env}. Copy ${DEPLOY_ROOT}/common.env.example first."
  [[ -f "$target_env" ]] || die "Missing environment config: ${target_env}. Copy the matching .env.example first."

  set -a
  # shellcheck disable=SC1090
  source "$common_env"
  # shellcheck disable=SC1090
  source "$target_env"
  set +a

  DEPLOY_ENV_NAME="$env_name"
  SSH_PORT="${SSH_PORT:-22}"
  SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY:-}"
  REMOTE_SUDO="${REMOTE_SUDO:-sudo}"
  BACKEND_REPO_DIR="${BACKEND_REPO_DIR:-/var/cashless/stustapay}"
  BACKEND_BRANCH="${BACKEND_BRANCH:-merge-current-state-2}"
  BACKEND_VENV_DIR="${BACKEND_VENV_DIR:-/var/cashless/venv}"
  BACKEND_RUN_USER="${BACKEND_RUN_USER:-cashless}"
  BACKEND_CONFIG_PATH="${BACKEND_CONFIG_PATH:-/etc/cashless/server.yaml}"
  BACKEND_SERVICES="${BACKEND_SERVICES:-stustapay-admin.service stustapay-customerportal.service stustapay-payment.service stustapay-terminal.service}"
  AZURE_STORAGE_AUTH_MODE="${AZURE_STORAGE_AUTH_MODE:-login}"
  AZURE_STORAGE_SAS_TOKEN="${AZURE_STORAGE_SAS_TOKEN:-}"
  AZURE_STORAGE_SAS_TOKEN="${AZURE_STORAGE_SAS_TOKEN#\?}"
  ADMIN_BLOB_PATH="${ADMIN_BLOB_PATH:-dist/apps/administration}"
  CUSTOMERPORTAL_BLOB_PATH="${CUSTOMERPORTAL_BLOB_PATH:-dist/apps/customerportal}"
  ADMIN_SMOKE_URL="${ADMIN_SMOKE_URL:-}"
  CUSTOMERPORTAL_SMOKE_URL="${CUSTOMERPORTAL_SMOKE_URL:-}"
  TERMINAL_HEALTH_URL="${TERMINAL_HEALTH_URL:-}"
  setup_args
}

validate_env() {
  local required=(
    AZURE_SUBSCRIPTION_ID
    AZURE_STORAGE_ACCOUNT
    AZURE_STORAGE_CONTAINER
    VM_HOST
    SSH_USER
    BACKEND_REPO_DIR
    BACKEND_BRANCH
    BACKEND_VENV_DIR
    BACKEND_RUN_USER
    BACKEND_CONFIG_PATH
    BACKEND_SERVICES
  )
  local var
  for var in "${required[@]}"; do
    [[ -n "${!var:-}" ]] || die "Missing required config variable: ${var}"
  done
  ((${#BACKEND_SERVICES_ARRAY[@]} > 0)) || die "BACKEND_SERVICES must contain at least one systemd unit"
  [[ -f "$REMOTE_DEPLOY_SCRIPT" ]] || die "Missing remote deployment helper: ${REMOTE_DEPLOY_SCRIPT}"
}

prepare_local_revision() {
  local status branch origin_commit

  status="$(git -C "$REPO_ROOT" status --porcelain)"
  [[ -z "$status" ]] || die "Local checkout is dirty; commit or stash changes before deploying"

  branch="$(git -C "$REPO_ROOT" branch --show-current)"
  [[ "$branch" == "$BACKEND_BRANCH" ]] || die "Local branch is ${branch:-detached}; expected ${BACKEND_BRANCH}"

  log "Fetching origin/${BACKEND_BRANCH}"
  git -C "$REPO_ROOT" fetch --quiet origin "$BACKEND_BRANCH"
  LOCAL_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  origin_commit="$(git -C "$REPO_ROOT" rev-parse "origin/${BACKEND_BRANCH}")"
  [[ "$LOCAL_COMMIT" == "$origin_commit" ]] || die "Local HEAD does not match origin/${BACKEND_BRANCH}; push or update before deploying"
  export LOCAL_COMMIT
}

azure_login_check() {
  az account set --subscription "$AZURE_SUBSCRIPTION_ID" >/dev/null
  az account show >/dev/null
  [[ "$(az storage container exists "${AZURE_STORAGE_ARGS[@]}" --name "$AZURE_STORAGE_CONTAINER" --query exists --output tsv)" == "true" ]] \
    || die "Azure Blob container is not accessible"
}

shell_join_quoted() {
  local output="" value
  for value in "$@"; do
    printf -v output '%s%q ' "$output" "$value"
  done
  printf '%s' "$output"
}

run_remote_helper() {
  local mode="$1"
  local remote_command
  remote_command="$(shell_join_quoted \
    bash -s -- "$mode" "$REMOTE_SUDO" "$BACKEND_REPO_DIR" "$BACKEND_BRANCH" "${LOCAL_COMMIT:-}" \
    "$BACKEND_VENV_DIR" "$BACKEND_RUN_USER" "$BACKEND_CONFIG_PATH" "$BACKEND_SERVICES")"
  ssh "${SSH_BASE_ARGS[@]}" "$(ssh_target)" "$remote_command" <"$REMOTE_DEPLOY_SCRIPT"
}

run_preflight() {
  require_command az
  require_command cmp
  require_command curl
  require_command git
  require_command grep
  require_command mktemp
  require_command npm
  require_command npx
  require_command sed
  require_command ssh
  require_command sort

  prepare_local_revision
  azure_login_check
  log "Checking backend prerequisites on $(ssh_target)"
  run_remote_helper preflight
}

build_web_apps() {
  log "Installing locked web dependencies"
  (cd "${REPO_ROOT}/web" && npm ci)
  log "Building administration and customer portal"
  (cd "${REPO_ROOT}/web" && npx nx run-many --target=build --projects=administration,customerportal --skip-nx-cache)
  [[ -f "${REPO_ROOT}/web/dist/apps/administration/index.html" ]] || die "Administration build did not produce index.html"
  [[ -f "${REPO_ROOT}/web/dist/apps/customerportal/index.html" ]] || die "Customer portal build did not produce index.html"
}

print_deploy_summary() {
  cat <<EOF
[deploy] Production deployment summary
  Environment:      ${DEPLOY_ENV_NAME}
  Backend host:     $(ssh_target)
  Backend branch:   ${BACKEND_BRANCH}
  Commit:           ${LOCAL_COMMIT}
  Backend checkout: ${BACKEND_REPO_DIR}
  Services:         ${BACKEND_SERVICES}
  Azure storage:    ${AZURE_STORAGE_ACCOUNT}/${AZURE_STORAGE_CONTAINER}
  Administration:   ${ADMIN_BLOB_PATH}
  Customer portal:  ${CUSTOMERPORTAL_BLOB_PATH}
EOF
}

confirm_deploy() {
  local assume_yes="$1" reply
  [[ "$assume_yes" == "true" ]] && return 0
  [[ -t 0 ]] || die "Deployment confirmation requires a terminal; rerun with --yes after reviewing the summary"
  read -r -p "Deploy this commit to ${DEPLOY_ENV_NAME}? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" || "$reply" == "yes" || "$reply" == "YES" ]] \
    || die "Deployment cancelled"
}

run_remote_deploy() {
  run_remote_helper deploy
}

report_remote_status() {
  warn "Remote backend status:"
  run_remote_helper status || true
}

blob_exists() {
  local blob_name="$1"
  [[ "$(az storage blob exists "${AZURE_STORAGE_ARGS[@]}" --container-name "$AZURE_STORAGE_CONTAINER" \
    --name "$blob_name" --query exists --output tsv)" == "true" ]]
}

verify_uploaded_app() {
  local local_dir="$1" destination="$2" label="$3"
  local downloaded_index js_ref blob_name
  downloaded_index="$(mktemp "${TMPDIR:-/tmp}/stustapay-${label}-index-XXXXXX")"

  az storage blob download "${AZURE_STORAGE_ARGS[@]}" \
    --container-name "$AZURE_STORAGE_CONTAINER" \
    --name "${destination}/index.html" \
    --file "$downloaded_index" \
    --overwrite >/dev/null || {
      rm -f "$downloaded_index"
      return 1
    }
  cmp --silent "${local_dir}/index.html" "$downloaded_index" || {
    rm -f "$downloaded_index"
    warn "Uploaded ${label} index.html does not match the local build"
    return 1
  }

  while IFS= read -r js_ref; do
    js_ref="${js_ref#./}"
    js_ref="${js_ref#/}"
    blob_name="${destination}/${js_ref}"
    blob_exists "$blob_name" || {
      rm -f "$downloaded_index"
      warn "Uploaded ${label} bundle is missing: ${blob_name}"
      return 1
    }
  done < <(grep -oE 'src="[^"]+\.js"' "$downloaded_index" | sed -E 's/^src="//; s/"$//' | sort -u)

  if ! grep -qE 'src="[^"]+\.js"' "$downloaded_index"; then
    rm -f "$downloaded_index"
    warn "Uploaded ${label} index.html does not reference a JavaScript bundle"
    return 1
  fi
  rm -f "$downloaded_index"
}

upload_web_app() {
  local source_dir="$1" destination="$2" label="$3"
  log "Uploading ${label} to ${destination}"
  az storage blob upload-batch "${AZURE_STORAGE_ARGS[@]}" \
    --destination "$AZURE_STORAGE_CONTAINER" \
    --destination-path "$destination" \
    --source "$source_dir" \
    --overwrite true >/dev/null || return 1
  verify_uploaded_app "$source_dir" "$destination" "$label" || return 1
}

upload_and_verify_web_apps() {
  local admin_dist="${REPO_ROOT}/web/dist/apps/administration"
  local customer_dist="${REPO_ROOT}/web/dist/apps/customerportal"

  if upload_web_app "$admin_dist" "$ADMIN_BLOB_PATH" administration; then
    ADMIN_UPLOAD_STATUS="verified"
  else
    ADMIN_UPLOAD_STATUS="failed"
    return 1
  fi

  if upload_web_app "$customer_dist" "$CUSTOMERPORTAL_BLOB_PATH" customerportal; then
    CUSTOMER_UPLOAD_STATUS="verified"
  else
    CUSTOMER_UPLOAD_STATUS="failed"
    return 1
  fi
}

smoke_url() {
  local label="$1" url="$2"
  [[ -z "$url" ]] && return 0
  log "Checking ${label}: ${url}"
  curl --fail --silent --show-error --location "$url" >/dev/null
}

run_public_smoke_checks() {
  smoke_url administration "$ADMIN_SMOKE_URL" || return 1
  smoke_url customerportal "$CUSTOMERPORTAL_SMOKE_URL" || return 1
  smoke_url terminal-health "$TERMINAL_HEALTH_URL" || return 1
}

report_deployment_state() {
  log "Deployment state: commit=${LOCAL_COMMIT} administration=${ADMIN_UPLOAD_STATUS:-not-started} customerportal=${CUSTOMER_UPLOAD_STATUS:-not-started}"
  report_remote_status
}
