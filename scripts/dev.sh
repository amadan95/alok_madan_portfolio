#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${ROOT_DIR}/site"
PORT="${PORT:-3000}"

find_listener_pids() {
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -Fp 2>/dev/null | sed -n 's/^p//p'
}

cwd_for_pid() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'
}

stop_stale_workspace_servers() {
  local pid cwd
  while IFS= read -r pid; do
    [[ -n "${pid}" ]] || continue
    cwd="$(cwd_for_pid "${pid}")"
    if [[ "${cwd}" == "${ROOT_DIR}" || "${cwd}" == "${SITE_DIR}" ]]; then
      kill "${pid}" 2>/dev/null || true
      wait_for_port_release
    fi
  done < <(find_listener_pids)
}

wait_for_port_release() {
  local attempts=0
  while lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts > 30 )); then
      break
    fi
    sleep 0.25
  done
}

clear_stale_app_artifacts() {
  local stamp next_target export_target
  stamp="$(date +%s)"

  if [[ -d "${SITE_DIR}/.next" ]]; then
    next_target="${SITE_DIR}/.next.predev.${stamp}"
    mv "${SITE_DIR}/.next" "${next_target}"
  fi

  if [[ -d "${SITE_DIR}/out" ]]; then
    export_target="${ROOT_DIR}/.site-export.${stamp}"
    mv "${SITE_DIR}/out" "${export_target}"
  fi
}

cd "${SITE_DIR}"
stop_stale_workspace_servers
clear_stale_app_artifacts

exec npm run dev:internal -- "$@"
