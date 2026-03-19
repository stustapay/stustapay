#!/usr/bin/env bash

set -euo pipefail

REMOTE_DIR="${1:?remote bundle dir required}"
source "${REMOTE_DIR}/metadata.env"

if [[ -n "${REMOTE_SUDO}" ]]; then
  SUDO=("${REMOTE_SUDO}")
else
  SUDO=()
fi

release_dir="${APP_ROOT}/releases/${RELEASE_ID}"

is_enabled_unit() {
  local candidate="$1"
  local unit
  for unit in "${enabled_units[@]}"; do
    [[ "$unit" == "$candidate" ]] && return 0
  done
  return 1
}

"${SUDO[@]}" mkdir -p "${APP_ROOT}/releases" "${APP_ROOT}/shared" "${release_dir}/nginx"

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  "${SUDO[@]}" adduser --system --group --home /var/lib/stustapay --shell /bin/bash "${DEPLOY_USER}"
fi

"${SUDO[@]}" install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" "${APP_ROOT}/releases" "${APP_ROOT}/shared"
"${SUDO[@]}" install -d "${SYSTEMD_DIR}" "${NGINX_SITES_AVAILABLE_DIR}" "${NGINX_SITES_ENABLED_DIR}" "$(dirname "${CONFIG_PATH}")"

for unit_file in "${REMOTE_DIR}/systemd/"*.service; do
  "${SUDO[@]}" install -m 0644 "$unit_file" "${SYSTEMD_DIR}/$(basename "$unit_file")"
done

for site_file in "${REMOTE_DIR}/release/"stustapay-*.conf; do
  "${SUDO[@]}" install -m 0644 "$site_file" "${release_dir}/nginx/$(basename "$site_file")"
  "${SUDO[@]}" install -m 0644 "$site_file" "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")"
  "${SUDO[@]}" ln -sfn "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" "${NGINX_SITES_ENABLED_DIR}/$(basename "$site_file")"
done

read -r -a enabled_units <<<"${ENABLED_UNITS}"
read -r -a all_units <<<"${ALL_UNITS}"
"${SUDO[@]}" install -m 0640 -o root -g "${DEPLOY_GROUP}" "${REMOTE_DIR}/release/config.yaml" "${CONFIG_PATH}"

for unit in "${all_units[@]}"; do
  if is_enabled_unit "$unit"; then
    "${SUDO[@]}" systemctl enable "${unit}" >/dev/null
  else
    "${SUDO[@]}" systemctl disable --now "${unit}" >/dev/null 2>&1 || true
  fi
done

"${SUDO[@]}" systemctl daemon-reload
"${SUDO[@]}" nginx -t
"${SUDO[@]}" systemctl reload nginx >/dev/null 2>&1 || true

printf '%s\n' "${RELEASE_ID}" | "${SUDO[@]}" tee "${APP_ROOT}/shared/bootstrap-release" >/dev/null
rm -rf "${REMOTE_DIR}"
