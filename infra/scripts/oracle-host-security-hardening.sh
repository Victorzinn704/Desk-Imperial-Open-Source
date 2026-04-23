#!/usr/bin/env bash

set -euo pipefail

WG_PORT="${WG_PORT:-51820}"
SSH_PORT="${SSH_PORT:-22}"
ALLOW_USERS="${ALLOW_USERS:-ubuntu}"
ALLOW_TCP_FORWARDING="${ALLOW_TCP_FORWARDING:-local}"
DISABLE_RPCBIND="${DISABLE_RPCBIND:-1}"
EXTRA_UFW_ALLOW_RULES="${EXTRA_UFW_ALLOW_RULES:-}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root."
    exit 1
  fi
}

write_sshd_dropin() {
  install -d -m 0755 /etc/ssh/sshd_config.d
  cat >/etc/ssh/sshd_config.d/99-desk-hardening.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding ${ALLOW_TCP_FORWARDING}
GatewayPorts no
PermitTunnel no
PermitEmptyPasswords no
MaxAuthTries 3
MaxSessions 4
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 20
TCPKeepAlive no
AuthorizedKeysFile .ssh/authorized_keys
AllowUsers ${ALLOW_USERS}
UseDNS no
EOF

  sshd -t
  systemctl reload ssh || systemctl reload sshd
}

write_fail2ban() {
  mkdir -p /etc/fail2ban/jail.d
  cat >/etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
backend = systemd
findtime = 10m
maxretry = 4
bantime = 1h
EOF
}

configure_firewall() {
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw limit "${SSH_PORT}/tcp"
  ufw allow "${WG_PORT}/udp"
  if [[ -n "${EXTRA_UFW_ALLOW_RULES}" ]]; then
    IFS=',' read -ra extra_rules <<<"${EXTRA_UFW_ALLOW_RULES}"
    for rule in "${extra_rules[@]}"; do
      trimmed="$(echo "${rule}" | xargs)"
      [[ -n "${trimmed}" ]] || continue
      ufw allow "${trimmed}"
    done
  fi
  ufw --force enable
}

disable_rpcbind() {
  if [[ "${DISABLE_RPCBIND}" != "1" ]]; then
    return 0
  fi

  if systemctl list-unit-files | grep -q '^rpcbind\.service'; then
    systemctl stop rpcbind rpcbind.socket || true
    systemctl disable rpcbind rpcbind.socket || true
    systemctl mask rpcbind rpcbind.socket || true
  fi
}

main() {
  require_root
  write_sshd_dropin
  write_fail2ban
  configure_firewall
  disable_rpcbind
  systemctl enable --now fail2ban
}

main "$@"
