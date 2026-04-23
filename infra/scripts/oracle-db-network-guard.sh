#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/infra/oracle/db/.env"
CHAIN="DESK_DB_GUARD"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root."
    exit 1
  fi
}

require_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Arquivo ausente: ${ENV_FILE}"
    exit 1
  fi

  # shellcheck source=/dev/null
  source "${ENV_FILE}"

  : "${DB_PRIVATE_IP:?DB_PRIVATE_IP obrigatorio}"
  : "${PROD_WG_IP:?PROD_WG_IP obrigatorio}"
  : "${OPS_WG_IP:?OPS_WG_IP obrigatorio}"
}

ensure_chain() {
  iptables -nL DOCKER-USER >/dev/null 2>&1 || iptables -N DOCKER-USER
  iptables -nL "${CHAIN}" >/dev/null 2>&1 || iptables -N "${CHAIN}"
  iptables -C DOCKER-USER -j "${CHAIN}" >/dev/null 2>&1 || iptables -I DOCKER-USER 1 -j "${CHAIN}"
  iptables -F "${CHAIN}"
}

apply_rules() {
  iptables -A "${CHAIN}" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
  iptables -A "${CHAIN}" -s "${PROD_WG_IP}" -d "${DB_PRIVATE_IP}" -p tcp --dport 6432 -j RETURN
  iptables -A "${CHAIN}" -s "${PROD_WG_IP}" -d "${DB_PRIVATE_IP}" -p tcp --dport 5432 -j RETURN
  iptables -A "${CHAIN}" -s "${OPS_WG_IP}" -d "${DB_PRIVATE_IP}" -p tcp --dport 5432 -j RETURN
  iptables -A "${CHAIN}" -s "${OPS_WG_IP}" -d "${DB_PRIVATE_IP}" -p tcp --dport 9100 -j RETURN
  iptables -A "${CHAIN}" -s "${OPS_WG_IP}" -d "${DB_PRIVATE_IP}" -p tcp --dport 9187 -j RETURN
  iptables -A "${CHAIN}" -d "${DB_PRIVATE_IP}" -p tcp -m multiport --dports 5432,6432,9100,9187 -j DROP
  iptables -A "${CHAIN}" -j RETURN
}

show_rules() {
  iptables -S "${CHAIN}"
}

main() {
  require_root
  require_env
  ensure_chain
  apply_rules
  show_rules
}

main "$@"
