#!/usr/bin/env bash

set -euo pipefail

REMOTE_DIR="${1:?remote bundle dir required}"
source "${REMOTE_DIR}/metadata.env"

current_release=""
previous_release=""

[[ -f "${APP_ROOT}/shared/current-release" ]] && current_release="$(cat "${APP_ROOT}/shared/current-release")"
[[ -f "${APP_ROOT}/shared/previous-release" ]] && previous_release="$(cat "${APP_ROOT}/shared/previous-release")"

printf 'Environment root: %s\n' "${APP_ROOT}"
printf 'Current release: %s\n' "${current_release:-<none>}"
printf 'Previous release: %s\n' "${previous_release:-<none>}"
printf 'Available releases:\n'
if [[ -d "${APP_ROOT}/releases" ]]; then
  find "${APP_ROOT}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
fi

rm -rf "${REMOTE_DIR}"
