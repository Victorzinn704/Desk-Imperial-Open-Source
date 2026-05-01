#!/usr/bin/env bash

set -euo pipefail

WG_PORT="${WG_PORT:-51820}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root."
    exit 1
  fi
}

install_compose_package() {
  if apt-cache show docker-compose-plugin >/dev/null 2>&1; then
    apt-get install -y --no-install-recommends docker-compose-plugin
  elif apt-cache show docker-compose-v2 >/dev/null 2>&1; then
    apt-get install -y --no-install-recommends docker-compose-v2
  else
    apt-get install -y --no-install-recommends docker-compose
  fi
}

write_sysctl() {
  cat >/etc/sysctl.d/99-desk-ops.conf <<'EOF'
net.ipv4.ip_forward=1
net.ipv4.conf.all.src_valid_mark=1
vm.swappiness=10
vm.max_map_count=262144
EOF
  sysctl --system >/dev/null
}

main() {
  require_root

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg jq rsync unzip \
    docker.io iptables \
    wireguard fail2ban ufw
  install_compose_package

  install -d -m 0755 /opt/desk-imperial/infra

  write_sysctl
  ALLOW_TCP_FORWARDING=local bash /opt/desk-imperial/infra/scripts/oracle-host-security-hardening.sh

  systemctl enable --now docker

  echo "Host de ops preparado."
  echo "Próximos passos:"
  echo "1. sincronizar a pasta infra/ do repositório para /opt/desk-imperial/infra"
  echo "2. copiar infra/oracle/ops/.env.example para infra/oracle/ops/.env e preencher segredos"
  echo "3. opcional: copiar wg-ops.conf para /etc/wireguard/wg0.conf e subir wg-quick@wg0"
  echo "4. docker compose -f infra/oracle/ops/compose.yaml --env-file infra/oracle/ops/.env up -d"
}

main "$@"
