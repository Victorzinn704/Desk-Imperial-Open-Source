# Network Exposure Model

## 2026-04-22

Modelo objetivo para evitar confusão entre "trafego entre VMs" e "serviço exposto na internet".

## Regra principal

**Trafego entre VMs em contas/VCNs separadas pode atravessar a internet sem expor o serviço, desde que o transporte seja cifrado e os serviços internos nao estejam publicados.**

No Desk Imperial, o padrão correto é:

- **WireGuard** para trafego servidor-servidor
- **SSH tunnel** para acesso humano às interfaces privadas
- **HTTPS público** apenas para o produto final que o cliente usa

## O que fica público

### Produção web

- `80/tcp` e `443/tcp` no host do app
- `22/tcp` para administração
- `51820/udp` apenas se esse host entrar na malha WireGuard

### Banco self-hosted

- `22/tcp`
- `51820/udp`

**Nada de `5432`, `6432`, `9100`, `9187` público.**

### Host de ops

- `22/tcp`
- `51820/udp` se participar da malha

**Nada de `3001`, `3002`, `9090`, `9093`, `9000`, `3100`, `3200`, `4318` público.**

### Runner

- `22/tcp`
- `51820/udp`

Sem interface pública de aplicação.

## O que atravessa a internet mas nao fica exposto

### WireGuard

Quando `vm-free-01` fala com a Ampere da Lohana via WireGuard:

- o datagrama UDP passa por IP público;
- o conteúdo trafega cifrado;
- o banco continua preso ao IP do túnel;
- a internet enxerga apenas a existência do endpoint WireGuard, não o PostgreSQL.

### SSH tunnel

Quando você usa:

```powershell
ssh -L 3002:127.0.0.1:3002 ubuntu@OPS_HOST
```

o Metabase **nao fica público**:

- Metabase segue preso em `127.0.0.1:3002` no host remoto;
- só a sua máquina enxerga `localhost:3002`;
- o serviço não abre porta nova para a internet.

## Riscos reais

Os riscos que ainda existem mesmo com túnel e VPN são:

1. `22/tcp` e `51820/udp` continuam **descobráveis** por scan;
2. chave SSH vazada compromete administração;
3. WireGuard mal configurado pode aceitar peer indevido;
4. Docker publicado em `0.0.0.0` pode furar a intenção de isolamento;
5. security list/NSG frouxos podem abrir mais do que o host imagina;
6. logs e BI podem vazar dado se tiverem acesso largo demais.

## Controles mínimos obrigatórios

- security lists/NSG só com portas estritamente necessárias
- firewall local no host
- `fail2ban`
- `PasswordAuthentication no`
- `PermitRootLogin no`
- `X11Forwarding no`
- `AllowTcpForwarding local`
- serviços internos bindados ao IP WireGuard ou loopback
- guards no `DOCKER-USER` para portas sensíveis
- usuários separados para `app`, `bi`, `backup`, `monitor`

## Estado auditado em 2026-04-22

Na tenancy da Lohana, a auditoria mostrou:

- OCI hoje expõe apenas `22/tcp` por security list default;
- nenhum host tinha Docker ativo;
- nenhum host tinha PostgreSQL ou Metabase publicados;
- os hosts ainda vinham crus de Ubuntu cloud image, com:
  - `rpcbind` escutando em `111/tcp` e `111/udp`
  - `X11Forwarding yes`
  - sem `ufw`
  - sem `fail2ban`

Por isso o próximo passo obrigatório foi codificar hardening de SSH/firewall antes do bootstrap de serviços.

## Estado validado depois do hardening

Depois da passada de endurecimento e da subida da malha WireGuard:

- `vm1` mantém público só `22/tcp`, `80/tcp`, `443/tcp` e `51820/udp`
- `vm1:8080` deixou de ser público e ficou preso em `127.0.0.1`
- `vm2` mantém público só `22/tcp`, `80/tcp`, `443/tcp` e `51820/udp`
- Grafana, Prometheus, Loki, Tempo, Alertmanager e Sonar seguem fechados ao público na `vm2`
- `vm4` e `vm5` mantêm público só `22/tcp` e `51820/udp`
- `5432`, `6432`, `9100` e `9187` ficaram fechados do lado público na Ampere e no runner
- a malha privada `10.220.10.0/24` ficou funcional entre `vm1`, `vm2`, `vm4` e `vm5`

Pendência objetiva:

- `vm3` entrou em estado de recuperação e ficou travada em `STOPPING`; ela precisa de console/OCI antes de receber a mesma baseline.
