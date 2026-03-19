#!/usr/bin/env bash

set -euo pipefail

readonly DEPLOY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${DEPLOY_LIB_DIR}/../.." && pwd)"
readonly DEPLOY_ROOT="${REPO_ROOT}/deploy"
readonly DEPLOY_ENV_DIR="${DEPLOY_ROOT}/environments"

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

normalize_bool() {
  local value="${1:-false}"
  local lowered
  lowered="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    1|true|yes|on)
      printf 'true'
      ;;
    0|false|no|off|'')
      printf 'false'
      ;;
    *)
      die "Invalid boolean value: ${value}"
      ;;
  esac
}

bool_is_true() {
  [[ "$(normalize_bool "${1:-false}")" == "true" ]]
}

usage() {
  cat <<'EOF'
Usage:
  tools/deploy/cli.sh <command> --env <target> [options]

Commands:
  bootstrap-server   Prepare a remote VM with users, directories, nginx and systemd units
  dry-run            Validate local config, Azure access and remote prerequisites
  deploy             Build artifacts, upload them and roll out a release to the target env
  rollback           Roll back the target env to a previously installed release
  list-releases      Show remote releases and current/previous markers

Options:
  --env <target>     Environment name, resolved via deploy/environments/<target>.env
  --release <id>     Release id for rollback; deploy auto-generates one if omitted
  --help             Show this help
EOF
}

shell_assign() {
  printf '%s=%q\n' "$1" "$2"
}

ssh_target() {
  printf '%s@%s' "$SSH_USER" "$VM_HOST"
}

declare -a SSH_BASE_ARGS
declare -a SCP_BASE_ARGS

setup_ssh_args() {
  SSH_BASE_ARGS=(-o BatchMode=yes -o ConnectTimeout=10 -p "$SSH_PORT")
  SCP_BASE_ARGS=(-P "$SSH_PORT")
  if [[ -n "${SSH_PRIVATE_KEY:-}" ]]; then
    SSH_BASE_ARGS+=(-i "$SSH_PRIVATE_KEY")
    SCP_BASE_ARGS+=(-i "$SSH_PRIVATE_KEY")
  fi
}

remote_script() {
  local script_name="$1"
  printf '%s/%s' "$DEPLOY_LIB_DIR" "$script_name"
}

run_remote_script() {
  local script_name="$1"
  local remote_dir="$2"
  shift 2
  ssh "${SSH_BASE_ARGS[@]}" "$(ssh_target)" \
    "bash -s -- ${remote_dir@Q} $*" <"$(remote_script "$script_name")"
}

run_remote_cmd() {
  ssh "${SSH_BASE_ARGS[@]}" "$(ssh_target)" "$@"
}

copy_bundle_to_remote() {
  local bundle_dir="$1"
  local remote_dir="$2"
  run_remote_cmd "mkdir -p ${remote_dir@Q}"
  scp "${SCP_BASE_ARGS[@]}" -r "${bundle_dir}/." "$(ssh_target):${remote_dir}/"
}

load_env() {
  local env_name="$1"
  local common_env="${DEPLOY_ROOT}/common.env"
  local target_env="${DEPLOY_ENV_DIR}/${env_name}.env"

  [[ -f "$common_env" ]] || die "Missing deploy config: ${common_env}. Copy ${DEPLOY_ROOT}/common.env.example first."
  [[ -f "$target_env" ]] || die "Missing environment config: ${target_env}. Copy ${DEPLOY_ENV_DIR}/${env_name}.env.example first."

  set -a
  # shellcheck disable=SC1090
  source "$common_env"
  # shellcheck disable=SC1090
  source "$target_env"
  set +a

  DEPLOY_ENV_NAME="$env_name"
  APP_ROOT="${APP_ROOT:-/opt/stustapay}"
  CONFIG_PATH="${CONFIG_PATH:-/etc/stustapay/config.yaml}"
  SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
  NGINX_SITES_AVAILABLE_DIR="${NGINX_SITES_AVAILABLE_DIR:-/etc/nginx/sites-available}"
  NGINX_SITES_ENABLED_DIR="${NGINX_SITES_ENABLED_DIR:-/etc/nginx/sites-enabled}"
  REMOTE_SUDO="${REMOTE_SUDO:-sudo}"
  DEPLOY_USER="${DEPLOY_USER:-stustapay}"
  DEPLOY_GROUP="${DEPLOY_GROUP:-stustapay}"
  PYTHON_BIN="${PYTHON_BIN:-python3}"
  PUBLIC_SCHEME="${PUBLIC_SCHEME:-https}"
  SSH_PORT="${SSH_PORT:-22}"
  SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY:-}"
  REMOTE_TMP_ROOT="${REMOTE_TMP_ROOT:-/tmp}"
  ADMIN_API_PORT="${ADMIN_API_PORT:-8081}"
  CUSTOMERPORTAL_API_PORT="${CUSTOMERPORTAL_API_PORT:-8082}"
  TERMINAL_API_PORT="${TERMINAL_API_PORT:-8083}"

  ENABLE_PAYMENT_PROCESSOR="$(normalize_bool "${ENABLE_PAYMENT_PROCESSOR:-true}")"
  ENABLE_TICKET_PROCESSOR="$(normalize_bool "${ENABLE_TICKET_PROCESSOR:-true}")"
  ENABLE_BON_GENERATOR="$(normalize_bool "${ENABLE_BON_GENERATOR:-false}")"
  ENABLE_TSE_CONTROLLER="$(normalize_bool "${ENABLE_TSE_CONTROLLER:-false}")"
  CORE_TEST_MODE="$(normalize_bool "${CORE_TEST_MODE:-false}")"
  HEADWIND_ENABLED="$(normalize_bool "${HEADWIND_ENABLED:-false}")"

  ADMIN_BASE_URL="${ADMIN_BASE_URL:-${PUBLIC_SCHEME}://${ADMIN_DOMAIN}/api}"
  CUSTOMERPORTAL_BASE_URL="${CUSTOMERPORTAL_BASE_URL:-${PUBLIC_SCHEME}://${CUSTOMERPORTAL_DOMAIN}/api}"
  TERMINAL_BASE_URL="${TERMINAL_BASE_URL:-${PUBLIC_SCHEME}://${TERMINAL_DOMAIN}/api}"
  AZURE_STORAGE_AUTH_MODE="${AZURE_STORAGE_AUTH_MODE:-login}"

  local sas_token="${AZURE_STORAGE_SAS_TOKEN:-}"
  sas_token="${sas_token#\?}"
  AZURE_STORAGE_SAS_TOKEN="$sas_token"
  STORAGE_PROXY_BASE_URL="${STORAGE_PROXY_BASE_URL:-https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}}"
  STORAGE_PROXY_BASE_URL="${STORAGE_PROXY_BASE_URL%/}"
  STORAGE_PROXY_HOST="${STORAGE_PROXY_BASE_URL#https://}"
  STORAGE_PROXY_HOST="${STORAGE_PROXY_HOST#http://}"
  STORAGE_PROXY_HOST="${STORAGE_PROXY_HOST%%/*}"

  setup_ssh_args
}

validate_env() {
  local required=(
    AZURE_SUBSCRIPTION_ID
    AZURE_STORAGE_ACCOUNT
    AZURE_STORAGE_CONTAINER
    VM_HOST
    SSH_USER
    DB_HOST
    DB_NAME
    DB_USER
    DB_PASSWORD
    CORE_SECRET_KEY
    ADMIN_DOMAIN
    CUSTOMERPORTAL_DOMAIN
    TERMINAL_DOMAIN
    TLS_CERT_PATH
    TLS_KEY_PATH
    HEADWIND_BASE_URL
    HEADWIND_LOGIN
    HEADWIND_PASSWORD_MD5
  )

  local var
  for var in "${required[@]}"; do
    [[ -n "${!var:-}" ]] || die "Missing required config variable: ${var}"
  done
}

generate_release_id() {
  local timestamp git_sha
  timestamp="$(date -u +%Y%m%d%H%M%S)"
  git_sha="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
  printf '%s-%s' "$timestamp" "$git_sha"
}

unit_name_for_service() {
  case "$1" in
    administration-api) printf 'stustapay-administration-api.service' ;;
    customerportal-api) printf 'stustapay-customerportal-api.service' ;;
    terminalserver-api) printf 'stustapay-terminal-api.service' ;;
    payment-processor) printf 'stustapay-payment-processor.service' ;;
    ticket-processor) printf 'stustapay-ticket-processor.service' ;;
    bon-generator) printf 'stustapay-bon-generator.service' ;;
    tse-controller) printf 'stustapay-tse-controller.service' ;;
    *) die "Unknown service: $1" ;;
  esac
}

cli_command_for_service() {
  case "$1" in
    administration-api) printf 'administration-api' ;;
    customerportal-api) printf 'customerportal-api' ;;
    terminalserver-api) printf 'terminalserver-api' ;;
    payment-processor) printf 'payment-processor' ;;
    ticket-processor) printf 'ticket-processor' ;;
    bon-generator) printf 'bon' ;;
    tse-controller) printf 'tse signature-processor' ;;
    *) die "Unknown service: $1" ;;
  esac
}

description_for_service() {
  case "$1" in
    administration-api) printf 'StuStaPay Administration API' ;;
    customerportal-api) printf 'StuStaPay Customer Portal API' ;;
    terminalserver-api) printf 'StuStaPay Terminal API' ;;
    payment-processor) printf 'StuStaPay Payment Processor' ;;
    ticket-processor) printf 'StuStaPay Ticket Processor' ;;
    bon-generator) printf 'StuStaPay Bon Generator' ;;
    tse-controller) printf 'StuStaPay TSE Controller' ;;
    *) die "Unknown service: $1" ;;
  esac
}

enabled_services() {
  local -a services=(
    administration-api
    customerportal-api
    terminalserver-api
  )
  bool_is_true "$ENABLE_PAYMENT_PROCESSOR" && services+=(payment-processor)
  bool_is_true "$ENABLE_TICKET_PROCESSOR" && services+=(ticket-processor)
  bool_is_true "$ENABLE_BON_GENERATOR" && services+=(bon-generator)
  bool_is_true "$ENABLE_TSE_CONTROLLER" && services+=(tse-controller)
  printf '%s\n' "${services[@]}"
}

all_services() {
  printf '%s\n' \
    administration-api \
    customerportal-api \
    terminalserver-api \
    payment-processor \
    ticket-processor \
    bon-generator \
    tse-controller
}

write_metadata_env() {
  local destination="$1"
  local release_id="$2"
  local -a enabled_units=()
  local -a all_units=()
  local service

  while IFS= read -r service; do
    enabled_units+=("$(unit_name_for_service "$service")")
  done < <(enabled_services)
  while IFS= read -r service; do
    all_units+=("$(unit_name_for_service "$service")")
  done < <(all_services)

  : >"$destination"
  shell_assign APP_ROOT "$APP_ROOT" >>"$destination"
  shell_assign CONFIG_PATH "$CONFIG_PATH" >>"$destination"
  shell_assign SYSTEMD_DIR "$SYSTEMD_DIR" >>"$destination"
  shell_assign NGINX_SITES_AVAILABLE_DIR "$NGINX_SITES_AVAILABLE_DIR" >>"$destination"
  shell_assign NGINX_SITES_ENABLED_DIR "$NGINX_SITES_ENABLED_DIR" >>"$destination"
  shell_assign REMOTE_SUDO "$REMOTE_SUDO" >>"$destination"
  shell_assign DEPLOY_USER "$DEPLOY_USER" >>"$destination"
  shell_assign DEPLOY_GROUP "$DEPLOY_GROUP" >>"$destination"
  shell_assign PYTHON_BIN "$PYTHON_BIN" >>"$destination"
  shell_assign RELEASE_ID "$release_id" >>"$destination"
  shell_assign ENABLED_UNITS "${enabled_units[*]}" >>"$destination"
  shell_assign ALL_UNITS "${all_units[*]}" >>"$destination"
}

generate_config_yaml() {
  local destination="$1"
  local admin_base_url="${ADMIN_BASE_URL:-${PUBLIC_SCHEME}://${ADMIN_DOMAIN}/api}"
  local customerportal_base_url="${CUSTOMERPORTAL_BASE_URL:-${PUBLIC_SCHEME}://${CUSTOMERPORTAL_DOMAIN}/api}"
  local terminal_base_url="${TERMINAL_BASE_URL:-${PUBLIC_SCHEME}://${TERMINAL_DOMAIN}/api}"
  cat >"$destination" <<EOF
database:
  host: "${DB_HOST}"
  port: ${DB_PORT:-5432}
  user: "${DB_USER}"
  password: "${DB_PASSWORD}"
  dbname: "${DB_NAME}"

core:
  test_mode: ${CORE_TEST_MODE}
  secret_key: "${CORE_SECRET_KEY}"

administration:
  base_url: "${admin_base_url}"
  host: "127.0.0.1"
  port: ${ADMIN_API_PORT}

customerportal:
  base_url: "${customerportal_base_url}"
  host: "127.0.0.1"
  port: ${CUSTOMERPORTAL_API_PORT}

terminalserver:
  base_url: "${terminal_base_url}"
  host: "127.0.0.1"
  port: ${TERMINAL_API_PORT}

headwind:
  enabled: ${HEADWIND_ENABLED}
  base_url: "${HEADWIND_BASE_URL}"
  login: "${HEADWIND_LOGIN}"
  password_md5: "${HEADWIND_PASSWORD_MD5}"
EOF
}

generate_systemd_unit() {
  local service="$1"
  local destination="$2"
  local cli_command description
  cli_command="$(cli_command_for_service "$service")"
  description="$(description_for_service "$service")"
  cat >"$destination" <<EOF
[Unit]
Description=${description}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_GROUP}
WorkingDirectory=${APP_ROOT}/current
Environment=PYTHONUNBUFFERED=1
ExecStart=${APP_ROOT}/current/venv/bin/stustapay -c ${CONFIG_PATH} ${cli_command}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

storage_release_url() {
  local app_name="$1"
  local release_id="$2"
  local suffix="${3:-}"
  local query=""
  if [[ -n "${AZURE_STORAGE_SAS_TOKEN:-}" ]]; then
    query="?${AZURE_STORAGE_SAS_TOKEN}"
  fi
  printf '%s/releases/web/%s/%s%s%s' "$STORAGE_PROXY_BASE_URL" "$app_name" "$release_id" "$suffix" "$query"
}

generate_admin_nginx() {
  local release_id="$1"
  local destination="$2"
  local release_url asset_url index_url
  release_url="$(storage_release_url administration "$release_id")"
  asset_url="${release_url}\$request_uri"
  index_url="$(storage_release_url administration "$release_id" '/index.html')"
  cat >"$destination" <<EOF
upstream stustapay_administration_api {
    server 127.0.0.1:${ADMIN_API_PORT};
}

server {
    listen 80;
    listen [::]:80;
    server_name ${ADMIN_DOMAIN};

    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${ADMIN_DOMAIN};
    charset utf-8;

    ssl_certificate ${TLS_CERT_PATH};
    ssl_certificate_key ${TLS_KEY_PATH};

    location /api {
        proxy_pass http://stustapay_administration_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_redirect off;
    }

    location ~* \.[^/]+$ {
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${asset_url};
    }

    location / {
        proxy_intercept_errors on;
        error_page 404 = @admin_spa;
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${asset_url};
    }

    location @admin_spa {
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${index_url};
    }
}
EOF
}

generate_customerportal_nginx() {
  local release_id="$1"
  local destination="$2"
  local release_url asset_url index_url
  release_url="$(storage_release_url customerportal "$release_id")"
  asset_url="${release_url}\$request_uri"
  index_url="$(storage_release_url customerportal "$release_id" '/index.html')"
  cat >"$destination" <<EOF
upstream stustapay_customerportal_api {
    server 127.0.0.1:${CUSTOMERPORTAL_API_PORT};
}

server {
    listen 80;
    listen [::]:80;
    server_name ${CUSTOMERPORTAL_DOMAIN};

    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${CUSTOMERPORTAL_DOMAIN};
    charset utf-8;

    ssl_certificate ${TLS_CERT_PATH};
    ssl_certificate_key ${TLS_KEY_PATH};

    location /api {
        proxy_pass http://stustapay_customerportal_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_redirect off;
    }

    location ~* \.[^/]+$ {
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${asset_url};
    }

    location / {
        proxy_intercept_errors on;
        error_page 404 = @customerportal_spa;
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${asset_url};
    }

    location @customerportal_spa {
        proxy_ssl_server_name on;
        proxy_set_header Host ${STORAGE_PROXY_HOST};
        proxy_pass ${index_url};
    }
}
EOF
}

generate_terminal_nginx() {
  local destination="$1"
  cat >"$destination" <<EOF
upstream stustapay_terminal_api {
    server 127.0.0.1:${TERMINAL_API_PORT};
}

server {
    listen 80;
    listen [::]:80;
    server_name ${TERMINAL_DOMAIN};

    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${TERMINAL_DOMAIN};
    charset utf-8;

    ssl_certificate ${TLS_CERT_PATH};
    ssl_certificate_key ${TLS_KEY_PATH};

    location /api {
        proxy_pass http://stustapay_terminal_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_redirect off;
    }
}
EOF
}

create_bundle() {
  local release_id="$1"
  local mode="$2"
  local bundle_dir
  bundle_dir="$(mktemp -d "${TMPDIR:-/tmp}/stustapay-${DEPLOY_ENV_NAME}-${release_id}-XXXX")"

  mkdir -p "$bundle_dir/systemd" "$bundle_dir/nginx" "$bundle_dir/release"
  write_metadata_env "$bundle_dir/metadata.env" "$release_id"
  generate_config_yaml "$bundle_dir/release/config.yaml"
  generate_admin_nginx "$release_id" "$bundle_dir/release/stustapay-admin.conf"
  generate_customerportal_nginx "$release_id" "$bundle_dir/release/stustapay-customerportal.conf"
  generate_terminal_nginx "$bundle_dir/release/stustapay-terminal.conf"

  local service
  while IFS= read -r service; do
    generate_systemd_unit "$service" "$bundle_dir/systemd/$(unit_name_for_service "$service")"
  done < <(all_services)

  if [[ "$mode" == "deploy" ]]; then
    mkdir -p "$bundle_dir/dist"
    cp "$ARTIFACT_SDIST" "$bundle_dir/dist/"
  fi

  printf '%s\n' "$bundle_dir"
}

azure_login_check() {
  require_command az
  az account set --subscription "$AZURE_SUBSCRIPTION_ID" >/dev/null
  az account show >/dev/null
}

remote_tmp_dir() {
  local release_id="$1"
  printf '%s/stustapay-%s-%s' "$REMOTE_TMP_ROOT" "$DEPLOY_ENV_NAME" "$release_id"
}

remote_release_dir() {
  local release_id="$1"
  printf '%s/releases/%s' "$APP_ROOT" "$release_id"
}

build_artifacts() {
  require_command git
  require_command npm
  require_command python3
  log "Building Python sdist"
  mkdir -p "${REPO_ROOT}/dist"
  rm -f "${REPO_ROOT}/dist"/stustapay-*.tar.gz
  (cd "$REPO_ROOT" && python3 -m build --sdist --outdir dist)
  ARTIFACT_SDIST="$(find "${REPO_ROOT}/dist" -maxdepth 1 -name 'stustapay-*.tar.gz' | head -n 1)"
  [[ -n "$ARTIFACT_SDIST" ]] || die "Failed to produce Python sdist"

  log "Building web applications"
  (cd "${REPO_ROOT}/web" && npm ci && npx nx run-many --target=build --projects=administration,customerportal)
}

upload_web_release() {
  local release_id="$1"
  local admin_dist="${REPO_ROOT}/web/dist/apps/administration"
  local customer_dist="${REPO_ROOT}/web/dist/apps/customerportal"

  [[ -d "$admin_dist" ]] || die "Missing web build output: ${admin_dist}"
  [[ -d "$customer_dist" ]] || die "Missing web build output: ${customer_dist}"

  log "Uploading administration web app to Azure Blob Storage"
  az storage blob upload-batch \
    --auth-mode "$AZURE_STORAGE_AUTH_MODE" \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --destination "$AZURE_STORAGE_CONTAINER" \
    --destination-path "releases/web/administration/${release_id}" \
    --source "$admin_dist" \
    --overwrite true >/dev/null

  log "Uploading customer portal web app to Azure Blob Storage"
  az storage blob upload-batch \
    --auth-mode "$AZURE_STORAGE_AUTH_MODE" \
    --account-name "$AZURE_STORAGE_ACCOUNT" \
    --destination "$AZURE_STORAGE_CONTAINER" \
    --destination-path "releases/web/customerportal/${release_id}" \
    --source "$customer_dist" \
    --overwrite true >/dev/null
}

run_smoke_checks() {
  local public_admin="${PUBLIC_SCHEME}://${ADMIN_DOMAIN}"
  local public_customer="${PUBLIC_SCHEME}://${CUSTOMERPORTAL_DOMAIN}"
  local public_terminal="${PUBLIC_SCHEME}://${TERMINAL_DOMAIN}"

  log "Running public smoke checks"
  curl --fail --silent --show-error "$public_admin/" >/dev/null
  curl --fail --silent --show-error "$public_admin/nonexistent-spa-route" | grep -qi '<html'
  curl --fail --silent --show-error "$public_admin/api/openapi.json" >/dev/null

  curl --fail --silent --show-error "$public_customer/" >/dev/null
  curl --fail --silent --show-error "$public_customer/nonexistent-spa-route" | grep -qi '<html'
  curl --fail --silent --show-error "$public_customer/api/openapi.json" >/dev/null

  curl --fail --silent --show-error "$public_terminal/api/health" >/dev/null

  local units=()
  while IFS= read -r service; do
    units+=("$(unit_name_for_service "$service")")
  done < <(enabled_services)
  log "Checking systemd service health on remote host"
  run_remote_cmd "systemctl is-active ${units[*]} >/dev/null"
}
