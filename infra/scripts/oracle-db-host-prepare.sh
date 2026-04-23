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
  cat >/etc/sysctl.d/99-desk-db.conf <<'EOF'
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
  install -d -m 0755 /var/lib/node_exporter/textfile_collector

  write_sysctl
  bash /opt/desk-imperial/infra/scripts/oracle-host-security-hardening.sh

  systemctl enable --now docker

  echo "Host de banco preparado."
  echo "Próximos passos:"
  echo "1. sincronizar a pasta infra/ do repositório para /opt/desk-imperial/infra"
  echo "2. copiar infra/oracle/network/wireguard/wg-db.example.conf para /etc/wireguard/wg0.conf"
  echo "3. systemctl enable --now wg-quick@wg0"
  echo "4. bash infra/scripts/oracle-db-network-guard.sh"
  echo "5. cp infra/oracle/db/systemd/network-guard.service /etc/systemd/system/network-guard.service && systemctl daemon-reload && systemctl enable --now network-guard.service"
  echo "6. bash infra/scripts/oracle-db-bootstrap.sh stanza-create"
  echo "7. bash infra/scripts/oracle-db-bootstrap.sh up"
}

main "$@"
