#!/usr/bin/env bash

set -euo pipefail

REMOTE_DIR="${1:?remote bundle dir required}"
source "${REMOTE_DIR}/metadata.env"

if [[ -n "${REMOTE_SUDO}" ]]; then
  SUDO=("${REMOTE_SUDO}")
else
  SUDO=()
fi

target_dir="${APP_ROOT}/releases/${RELEASE_ID}"
current_link="${APP_ROOT}/current"
current_release=""

[[ -d "${target_dir}" ]] || {
  echo "Release not found on remote host: ${RELEASE_ID}" >&2
  exit 1
}

read -r -a enabled_units <<<"${ENABLED_UNITS}"

restore_previous_state() {
  if [[ -z "${current_release}" ]]; then
    return 0
  fi
  local previous_dir="${APP_ROOT}/releases/${current_release}"
  if [[ ! -d "${previous_dir}" ]]; then
    return 0
  fi
  "${SUDO[@]}" install -m 0640 -o root -g "${DEPLOY_GROUP}" "${previous_dir}/config.yaml" "${CONFIG_PATH}" || true
  for site_file in "${previous_dir}/nginx/"*.conf; do
    "${SUDO[@]}" install -m 0644 "$site_file" "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" || true
    "${SUDO[@]}" ln -sfn "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" "${NGINX_SITES_ENABLED_DIR}/$(basename "$site_file")" || true
  done
  "${SUDO[@]}" ln -sfn "${previous_dir}" "${current_link}" || true
  if ((${#enabled_units[@]} > 0)); then
    "${SUDO[@]}" systemctl start "${enabled_units[@]}" >/dev/null 2>&1 || true
  fi
}

trap 'restore_previous_state' ERR

if [[ -L "${current_link}" ]]; then
  current_release="$(basename "$(readlink "${current_link}")")"
fi

if ((${#enabled_units[@]} > 0)); then
  "${SUDO[@]}" systemctl stop "${enabled_units[@]}" >/dev/null 2>&1 || true
fi

"${SUDO[@]}" install -m 0640 -o root -g "${DEPLOY_GROUP}" "${target_dir}/config.yaml" "${CONFIG_PATH}"
for site_file in "${target_dir}/nginx/"*.conf; do
  "${SUDO[@]}" install -m 0644 "$site_file" "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")"
  "${SUDO[@]}" ln -sfn "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" "${NGINX_SITES_ENABLED_DIR}/$(basename "$site_file")"
done
"${SUDO[@]}" ln -sfn "${target_dir}" "${current_link}"

printf '%s\n' "${current_release}" | "${SUDO[@]}" tee "${APP_ROOT}/shared/previous-release" >/dev/null
printf '%s\n' "${RELEASE_ID}" | "${SUDO[@]}" tee "${APP_ROOT}/shared/current-release" >/dev/null

if ((${#enabled_units[@]} > 0)); then
  "${SUDO[@]}" systemctl start "${enabled_units[@]}"
fi
"${SUDO[@]}" nginx -t
"${SUDO[@]}" systemctl reload nginx

trap - ERR
rm -rf "${REMOTE_DIR}"
