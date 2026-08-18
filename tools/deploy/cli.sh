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
shift

DEPLOY_ENV_NAME=""
ASSUME_YES="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      [[ $# -ge 2 ]] || die "--env requires a value"
      DEPLOY_ENV_NAME="$2"
      shift 2
      ;;
    --yes)
      ASSUME_YES="true"
      shift
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

[[ "$COMMAND" == "dry-run" || "$COMMAND" == "deploy" ]] || die "Unknown command: ${COMMAND}"
[[ -n "$DEPLOY_ENV_NAME" ]] || die "--env is required"
if [[ "$COMMAND" == "dry-run" && "$ASSUME_YES" == "true" ]]; then
  die "--yes is only valid with deploy"
fi

load_env "$DEPLOY_ENV_NAME"
validate_env
run_preflight

if [[ "$COMMAND" == "dry-run" ]]; then
  log "Dry-run checks passed for ${DEPLOY_ENV_NAME} at ${LOCAL_COMMIT}"
  exit 0
fi

build_web_apps
print_deploy_summary
confirm_deploy "$ASSUME_YES"

log "Updating backend on $(ssh_target)"
if ! run_remote_deploy; then
  warn "Backend deployment failed. The remote recovery policy was applied by the backend helper."
  report_remote_status
  exit 1
fi

ADMIN_UPLOAD_STATUS="pending"
CUSTOMER_UPLOAD_STATUS="pending"
if ! upload_and_verify_web_apps; then
  warn "Frontend deployment failed after the backend reached ${LOCAL_COMMIT}."
  report_deployment_state
  exit 1
fi

if ! run_public_smoke_checks; then
  warn "Public smoke checks failed after backend and frontend deployment."
  report_deployment_state
  exit 1
fi

report_deployment_state
log "Deployment finished successfully: ${DEPLOY_ENV_NAME} at ${LOCAL_COMMIT}"
