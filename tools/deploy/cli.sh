#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

COMMAND="${1:-}"
if [[ -z "$COMMAND" || "$COMMAND" == "--help" || "$COMMAND" == "-h" ]]; then
  usage
  exit 0
fi
shift || true

DEPLOY_ENV_NAME=""
RELEASE_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      DEPLOY_ENV_NAME="${2:-}"
      shift 2
      ;;
    --release)
      RELEASE_ID="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$DEPLOY_ENV_NAME" ]] || die "--env is required"

load_env "$DEPLOY_ENV_NAME"
validate_env

case "$COMMAND" in
  dry-run)
    require_command ssh
    require_command scp
    require_command curl
    require_command git
    require_command npm
    require_command python3
    azure_login_check
    log "Checking Azure Blob container access"
    [[ "$(az storage container exists \
      --auth-mode "$AZURE_STORAGE_AUTH_MODE" \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --name "$AZURE_STORAGE_CONTAINER" \
      --query exists \
      --output tsv)" == "true" ]] || die "Azure Blob container not accessible"
    log "Checking SSH connectivity"
    run_remote_cmd "true"
    log "Checking remote prerequisites"
    run_remote_cmd \
      "command -v ${PYTHON_BIN@Q} >/dev/null && ${PYTHON_BIN@Q} -m venv --help >/dev/null && command -v nginx >/dev/null && command -v systemctl >/dev/null"
    log "Dry-run checks passed for ${DEPLOY_ENV_NAME}"
    ;;
  bootstrap-server)
    RELEASE_ID="${RELEASE_ID:-bootstrap-pending}"
    BUNDLE_DIR="$(create_bundle "$RELEASE_ID" bootstrap)"
    REMOTE_DIR="$(remote_tmp_dir "$RELEASE_ID")"
    trap 'rm -rf "${BUNDLE_DIR:-}"' EXIT
    copy_bundle_to_remote "$BUNDLE_DIR" "$REMOTE_DIR"
    log "Bootstrapping remote VM"
    run_remote_script remote-bootstrap.sh "$REMOTE_DIR"
    log "Bootstrap completed for ${DEPLOY_ENV_NAME}"
    ;;
  deploy)
    azure_login_check
    RELEASE_ID="${RELEASE_ID:-$(generate_release_id)}"
    build_artifacts
    upload_web_release "$RELEASE_ID"
    BUNDLE_DIR="$(create_bundle "$RELEASE_ID" deploy)"
    REMOTE_DIR="$(remote_tmp_dir "$RELEASE_ID")"
    trap 'rm -rf "${BUNDLE_DIR:-}"' EXIT
    copy_bundle_to_remote "$BUNDLE_DIR" "$REMOTE_DIR"
    log "Installing release ${RELEASE_ID} on remote host"
    run_remote_script remote-install.sh "$REMOTE_DIR"
    run_smoke_checks
    log "Deployment finished: ${RELEASE_ID} (${DEPLOY_ENV_NAME})"
    ;;
  rollback)
    [[ -n "$RELEASE_ID" ]] || die "--release is required for rollback"
    BUNDLE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/stustapay-rollback-${DEPLOY_ENV_NAME}-${RELEASE_ID}-XXXX")"
    trap 'rm -rf "${BUNDLE_DIR:-}"' EXIT
    write_metadata_env "${BUNDLE_DIR}/metadata.env" "$RELEASE_ID"
    REMOTE_DIR="$(remote_tmp_dir "rollback-${RELEASE_ID}")"
    copy_bundle_to_remote "$BUNDLE_DIR" "$REMOTE_DIR"
    log "Rolling back ${DEPLOY_ENV_NAME} to ${RELEASE_ID}"
    run_remote_script remote-rollback.sh "$REMOTE_DIR"
    run_smoke_checks
    log "Rollback finished: ${RELEASE_ID} (${DEPLOY_ENV_NAME})"
    ;;
  list-releases)
    BUNDLE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/stustapay-list-${DEPLOY_ENV_NAME}-XXXX")"
    trap 'rm -rf "${BUNDLE_DIR:-}"' EXIT
    write_metadata_env "${BUNDLE_DIR}/metadata.env" "list-releases"
    REMOTE_DIR="$(remote_tmp_dir "list-releases")"
    copy_bundle_to_remote "$BUNDLE_DIR" "$REMOTE_DIR"
    run_remote_script remote-list-releases.sh "$REMOTE_DIR"
    ;;
  *)
    die "Unknown command: ${COMMAND}"
    ;;
esac
