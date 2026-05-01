#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-apply}"
STATE_DIR="${2:-}"
STATE_ROOT="${STATE_ROOT:-/var/backups/desk-imperial/cloudflare-origin-ufw}"
ROLLBACK_SECONDS="${ROLLBACK_SECONDS:-180}"
CLOUDFLARE_IPV4_URL="${CLOUDFLARE_IPV4_URL:-https://www.cloudflare.com/ips-v4}"
CLOUDFLARE_IPV6_URL="${CLOUDFLARE_IPV6_URL:-https://www.cloudflare.com/ips-v6}"
HTTP_PORTS_RAW="${HTTP_PORTS:-80 443}"
PRIVATE_IPV4_RANGES=(127.0.0.1/32 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16)
PRIVATE_IPV6_RANGES=(::1/128 fc00::/7)
EXTRA_IPV4_RANGES_RAW="${EXTRA_IPV4_RANGES:-}"
EXTRA_IPV6_RANGES_RAW="${EXTRA_IPV6_RANGES:-}"

read -r -a HTTP_PORTS <<<"${HTTP_PORTS_RAW}"
read -r -a EXTRA_IPV4_RANGES <<<"${EXTRA_IPV4_RANGES_RAW}"
read -r -a EXTRA_IPV6_RANGES <<<"${EXTRA_IPV6_RANGES_RAW}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root."
    exit 1
  fi
}

ensure_dependencies() {
  command -v curl >/dev/null 2>&1 || {
    echo "curl nao encontrado."
    exit 1
  }
  command -v ufw >/dev/null 2>&1 || {
    echo "ufw nao encontrado."
    exit 1
  }
}

create_state_dir() {
  local timestamp
  timestamp="$(date -u +%Y%m%d%H%M%S)"
  STATE_DIR="${STATE_ROOT}/${timestamp}"
  install -d -m 0700 "${STATE_DIR}"
}

write_backup() {
  install -d -m 0700 "${STATE_ROOT}"
  cp /etc/ufw/user.rules "${STATE_DIR}/user.rules.bak"
  cp /etc/ufw/user6.rules "${STATE_DIR}/user6.rules.bak"
  ufw status numbered >"${STATE_DIR}/ufw-status-numbered.before.txt"
  ufw status verbose >"${STATE_DIR}/ufw-status-verbose.before.txt"
}

write_rollback_script() {
  cat >"${STATE_DIR}/rollback.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cp "${STATE_DIR}/user.rules.bak" /etc/ufw/user.rules
cp "${STATE_DIR}/user6.rules.bak" /etc/ufw/user6.rules
ufw reload
rm -f "${STATE_DIR}/rollback.pending"
EOF
  chmod 700 "${STATE_DIR}/rollback.sh"
}

start_rollback_watchdog() {
  touch "${STATE_DIR}/rollback.pending"
  nohup bash -lc "sleep ${ROLLBACK_SECONDS}; if [[ -f '${STATE_DIR}/rollback.pending' ]]; then '${STATE_DIR}/rollback.sh' >>'${STATE_DIR}/rollback.log' 2>&1; fi" >/dev/null 2>&1 &
  echo "$!" >"${STATE_DIR}/rollback-watchdog.pid"
}

stop_rollback_watchdog() {
  if [[ -f "${STATE_DIR}/rollback-watchdog.pid" ]]; then
    local pid
    pid="$(cat "${STATE_DIR}/rollback-watchdog.pid")"
    kill "${pid}" >/dev/null 2>&1 || true
    rm -f "${STATE_DIR}/rollback-watchdog.pid"
  fi
}

fetch_cloudflare_ranges() {
  curl -fsSL "${CLOUDFLARE_IPV4_URL}" >"${STATE_DIR}/cloudflare-ipv4.txt"
  curl -fsSL "${CLOUDFLARE_IPV6_URL}" >"${STATE_DIR}/cloudflare-ipv6.txt"
}

delete_origin_http_rules() {
  while true; do
    local rule_number
    rule_number="$(
      ufw status numbered |
        sed -nE 's/^\[\s*([0-9]+)\].*(80\/tcp|443\/tcp).*/\1/p' |
        tail -n 1
    )"

    if [[ -z "${rule_number}" ]]; then
      break
    fi

    ufw --force delete "${rule_number}" >/dev/null
  done
}

allow_port_ranges() {
  local port
  local range

  for port in "${HTTP_PORTS[@]}"; do
    for range in "${PRIVATE_IPV4_RANGES[@]}"; do
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done

    for range in "${EXTRA_IPV4_RANGES[@]}"; do
      [[ -n "${range}" ]] || continue
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done

    for range in "${PRIVATE_IPV6_RANGES[@]}"; do
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done

    for range in "${EXTRA_IPV6_RANGES[@]}"; do
      [[ -n "${range}" ]] || continue
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done

    while IFS= read -r range; do
      [[ -n "${range}" ]] || continue
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done <"${STATE_DIR}/cloudflare-ipv4.txt"

    while IFS= read -r range; do
      [[ -n "${range}" ]] || continue
      ufw allow proto tcp from "${range}" to any port "${port}" >/dev/null
    done <"${STATE_DIR}/cloudflare-ipv6.txt"
  done
}

record_after_state() {
  ufw status numbered >"${STATE_DIR}/ufw-status-numbered.after.txt"
  ufw status verbose >"${STATE_DIR}/ufw-status-verbose.after.txt"
}

apply_rules() {
  create_state_dir
  write_backup
  write_rollback_script
  start_rollback_watchdog
  fetch_cloudflare_ranges
  delete_origin_http_rules
  allow_port_ranges
  ufw reload
  record_after_state
  echo "ALLOWLIST_APPLIED_STATE_DIR=${STATE_DIR}"
  echo "Rollback automatico armado para ${ROLLBACK_SECONDS}s."
  echo "Valide o edge e confirme com: sudo ${BASH_SOURCE[0]} confirm ${STATE_DIR}"
}

confirm_rules() {
  if [[ -z "${STATE_DIR}" || ! -d "${STATE_DIR}" ]]; then
    echo "Informe o STATE_DIR para confirmar."
    exit 1
  fi

  rm -f "${STATE_DIR}/rollback.pending"
  stop_rollback_watchdog
  echo "Rollback cancelado e allowlist confirmada."
}

rollback_rules() {
  if [[ -z "${STATE_DIR}" || ! -d "${STATE_DIR}" ]]; then
    echo "Informe o STATE_DIR para rollback."
    exit 1
  fi

  "${STATE_DIR}/rollback.sh"
  stop_rollback_watchdog
  echo "Rollback executado."
}

main() {
  require_root
  ensure_dependencies

  case "${MODE}" in
    apply)
      apply_rules
      ;;
    confirm)
      confirm_rules
      ;;
    rollback)
      rollback_rules
      ;;
    *)
      echo "Uso: $0 <apply|confirm|rollback> [state_dir]"
      exit 1
      ;;
  esac
}

main "$@"
