#!/usr/bin/env bash

set -euo pipefail

CHAIN_NAME="${CHAIN_NAME:-DESK_INPUT_GUARD}"
BLOCK_TCP_PORTS="${BLOCK_TCP_PORTS:-}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root."
    exit 1
  fi
}

ensure_chain() {
  iptables -N "${CHAIN_NAME}" 2>/dev/null || true
  iptables -C INPUT -j "${CHAIN_NAME}" 2>/dev/null || iptables -I INPUT 1 -j "${CHAIN_NAME}"
  iptables -F "${CHAIN_NAME}"
}

apply_rules() {
  if [[ -z "${BLOCK_TCP_PORTS}" ]]; then
    return 0
  fi

  IFS=',' read -ra ports <<<"${BLOCK_TCP_PORTS}"
  for port in "${ports[@]}"; do
    trimmed="$(echo "${port}" | xargs)"
    [[ -n "${trimmed}" ]] || continue
    iptables -A "${CHAIN_NAME}" -p tcp --dport "${trimmed}" -j DROP
  done
}

main() {
  require_root
  ensure_chain
  apply_rules
}

main "$@"
