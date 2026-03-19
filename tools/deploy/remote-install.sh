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
current_link="${APP_ROOT}/current"
current_release=""
switched="false"

read -r -a enabled_units <<<"${ENABLED_UNITS}"
read -r -a all_units <<<"${ALL_UNITS}"

is_enabled_unit() {
  local candidate="$1"
  local unit
  for unit in "${enabled_units[@]}"; do
    [[ "$unit" == "$candidate" ]] && return 0
  done
  return 1
}

restore_previous_state() {
  if [[ -z "${current_release}" ]]; then
    return 0
  fi
  local previous_dir="${APP_ROOT}/releases/${current_release}"
  if [[ ! -d "${previous_dir}" ]]; then
    return 0
  fi
  if [[ -f "${previous_dir}/config.yaml" ]]; then
    "${SUDO[@]}" install -m 0640 -o root -g "${DEPLOY_GROUP}" "${previous_dir}/config.yaml" "${CONFIG_PATH}" || true
  fi
  if compgen -G "${previous_dir}/nginx/*.conf" >/dev/null; then
    for site_file in "${previous_dir}/nginx/"*.conf; do
      "${SUDO[@]}" install -m 0644 "$site_file" "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" || true
      "${SUDO[@]}" ln -sfn "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" "${NGINX_SITES_ENABLED_DIR}/$(basename "$site_file")" || true
    done
    "${SUDO[@]}" nginx -t >/dev/null 2>&1 && "${SUDO[@]}" systemctl reload nginx >/dev/null 2>&1 || true
  fi
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

"${SUDO[@]}" mkdir -p "${release_dir}/nginx"
"${SUDO[@]}" install -d -o "${DEPLOY_USER}" -g "${DEPLOY_GROUP}" "${release_dir}"
"${SUDO[@]}" install -m 0644 "${REMOTE_DIR}/release/config.yaml" "${release_dir}/config.yaml"
for site_file in "${REMOTE_DIR}/release/"stustapay-*.conf; do
  "${SUDO[@]}" install -m 0644 "$site_file" "${release_dir}/nginx/$(basename "$site_file")"
done

artifact="$(find "${REMOTE_DIR}/dist" -maxdepth 1 -name 'stustapay-*.tar.gz' | head -n 1)"
[[ -n "${artifact}" ]] || {
  echo "Missing backend artifact in ${REMOTE_DIR}/dist" >&2
  exit 1
}

"${SUDO[@]}" rm -rf "${release_dir}/venv"
"${SUDO[@]}" "${PYTHON_BIN}" -m venv "${release_dir}/venv"
"${SUDO[@]}" "${release_dir}/venv/bin/pip" install --upgrade pip >/dev/null
"${SUDO[@]}" "${release_dir}/venv/bin/pip" install "${artifact}" >/dev/null
"${SUDO[@]}" chown -R "${DEPLOY_USER}:${DEPLOY_GROUP}" "${release_dir}"

"${SUDO[@]}" "${release_dir}/venv/bin/stustapay" -c "${release_dir}/config.yaml" db migrate

"${SUDO[@]}" install -m 0640 -o root -g "${DEPLOY_GROUP}" "${release_dir}/config.yaml" "${CONFIG_PATH}"
for unit_file in "${REMOTE_DIR}/systemd/"*.service; do
  "${SUDO[@]}" install -m 0644 "$unit_file" "${SYSTEMD_DIR}/$(basename "$unit_file")"
done
for site_file in "${release_dir}/nginx/"*.conf; do
  "${SUDO[@]}" install -m 0644 "$site_file" "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")"
  "${SUDO[@]}" ln -sfn "${NGINX_SITES_AVAILABLE_DIR}/$(basename "$site_file")" "${NGINX_SITES_ENABLED_DIR}/$(basename "$site_file")"
done

"${SUDO[@]}" systemctl daemon-reload
for unit in "${all_units[@]}"; do
  if is_enabled_unit "$unit"; then
    "${SUDO[@]}" systemctl enable "${unit}" >/dev/null
  else
    "${SUDO[@]}" systemctl disable --now "${unit}" >/dev/null 2>&1 || true
  fi
done
"${SUDO[@]}" ln -sfn "${release_dir}" "${current_link}"
switched="true"

printf '%s\n' "${current_release}" | "${SUDO[@]}" tee "${APP_ROOT}/shared/previous-release" >/dev/null
printf '%s\n' "${RELEASE_ID}" | "${SUDO[@]}" tee "${APP_ROOT}/shared/current-release" >/dev/null

if ((${#enabled_units[@]} > 0)); then
  "${SUDO[@]}" systemctl start "${enabled_units[@]}"
fi
"${SUDO[@]}" nginx -t
"${SUDO[@]}" systemctl reload nginx

trap - ERR
rm -rf "${REMOTE_DIR}"
