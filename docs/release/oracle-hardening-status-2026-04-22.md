# Oracle Hardening Status

## 2026-04-22

Status real da passada de endurecimento e malha privada entre as VMs do Desk Imperial.

## Resultado resumido

- `vm1`: endurecida e validada
- `vm2`: endurecida e validada
- `vm4`: endurecida e validada
- `vm5`: endurecida e validada
- `vm3`: recuperada por `OCI RESET` e endurecida no baseline mínimo seguro

## Baseline aplicado

Aplicado onde o acesso remoto permaneceu funcional:

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `X11Forwarding no`
- `AllowTcpForwarding local`
- `PermitTunnel no`
- `MaxAuthTries 3`
- `MaxSessions 4`
- `fail2ban` ativo para `sshd`
- firewall local ativo
- `rpcbind` desativado e mascarado
- `WireGuard` instalado e configurado

## Malha WireGuard validada

Faixa em uso:

- `vm1`: `10.220.10.1`
- `vm2`: `10.220.10.2`
- `vm4`: `10.220.10.10`
- `vm5`: `10.220.10.11`

Peers validados:

- `vm1 -> vm4`
- `vm2 -> vm4`
- `vm5 -> vm4`
- `vm4 -> vm1`
- `vm4 -> vm2`
- `vm4 -> vm5`

Smokes de reachability privados executados com sucesso:

- `vm1` pinga `10.220.10.10`
- `vm2` pinga `10.220.10.10`
- `vm5` pinga `10.220.10.10`
- `vm4` pinga `10.220.10.1`, `10.220.10.2` e `10.220.10.11`

## Superfície pública validada

### `vm1`

Esperado:

- `22/tcp`
- `80/tcp`
- `443/tcp`
- `51820/udp`

Fechado nesta rodada:

- `8080/tcp` do Sentinel ficou restrito a `127.0.0.1`
- `rpcbind` removido da superfície

### `vm2`

Esperado:

- `22/tcp`
- `80/tcp`
- `443/tcp`
- `51820/udp`

Mantidos privados:

- `3001`
- `9090`
- `9093`
- `9000`
- `3100`
- `3200`

### `vm4`

Esperado:

- `22/tcp`
- `51820/udp`

Validado como não público:

- `5432`
- `6432`
- `9100`
- `9187`

### `vm5`

Esperado:

- `22/tcp`
- `51820/udp`

Validado como não público:

- `5432`
- `6432`
- `9100`
- `9187`

### `vm3`

Esperado:

- `22/tcp`

Validado como não público:

- `111/tcp`
- `111/udp`
- listeners locais do PCP continuam apenas em `127.0.0.1`

Baseline confirmado:

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `KbdInteractiveAuthentication no`
- `X11Forwarding no`
- `AllowTcpForwarding local`
- `PermitTunnel no`
- `MaxAuthTries 3`
- `MaxSessions 4`
- `firewalld` ativo
- `rpcbind` desativado e mascarado

Observação:

- `fail2ban` não estava instalado na Oracle Linux micro; nesta rodada eu não forcei instalação para não reabrir instabilidade no guest

## Pendência crítica

Nenhuma pendência crítica aberta na malha atual de cinco VMs.

Pendência técnica menor:

- padronizar `fail2ban` também na `vm3` quando houver janela controlada para a Oracle Linux micro

## Próximos passos

1. manter observação por 24h após o cutover Neon -> Ampere
2. acompanhar disco, conexões, WAL, locks e falhas de backup no Grafana/Prometheus
3. abrir uma janela curta para instalar `fail2ban` na `vm3` sem mexer em runtime crítico
4. revisar política de retenção e custo do bucket de backup após a primeira semana de full/diff/WAL
