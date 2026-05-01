# Ampere DB Stack — PostgreSQL primário do Desk Imperial

Esta pasta materializa a camada de banco na **Ampere da Lohana**.

## Topologia alvo

- host: `lohana-ampere-01`
- shape: `VM.Standard.A1.Flex`
- CPU/RAM: `2 OCPU / 12 GB`
- papel: **OLTP primário**

Serviços desta stack:

- `postgres` com `pg_stat_statements`
- `pgbouncer`
- `postgres-exporter`
- `node-exporter`
- `pgbackrest`
- textfile metrics do `pgBackRest` para alertas de backup
- `network guard` no `DOCKER-USER` para fechar 5432/6432/9100/9187 por peer

## Portas

- PostgreSQL direto: `${DB_PRIVATE_IP}:5432`
- PgBouncer: `${DB_PRIVATE_IP}:6432`
- postgres_exporter: `${DB_PRIVATE_IP}:9187`
- node_exporter: `${DB_PRIVATE_IP}:9100`

Todas essas portas devem ficar acessíveis apenas pela malha WireGuard.

Exposição pública aceitável neste host:

- `22/tcp` para SSH administrativo
- `51820/udp` para WireGuard

Nada além disso deve ficar público.

## Fluxo de conexão

- aplicação (`vm-free-01`) -> `PgBouncer` (`6432`)
- `prisma migrate` / acesso administrativo -> PostgreSQL direto (`5432`)
- Metabase (`vm-free-02`) -> PostgreSQL direto com `bi_reader`
- Prometheus (`vm-free-02`) -> exporters (`9100` e `9187`)

## Como subir

1. sincronize a pasta `infra/` do repositório para `/opt/desk-imperial/infra`
2. copie `infra/oracle/db/.env.example` para `infra/oracle/db/.env`
3. preencha os segredos e os IPs privados WireGuard
4. garanta que o WireGuard já está de pé
5. aplique o guard de rede do Docker:

```bash
bash infra/scripts/oracle-db-network-guard.sh
sudo cp infra/oracle/db/systemd/network-guard.service /etc/systemd/system/network-guard.service
sudo systemctl daemon-reload
sudo systemctl enable --now network-guard.service
```

6. o bootstrap renderiza `infra/oracle/db/.runtime/pgbackrest.conf` e `pg_hba.conf` a partir dos templates antes de subir a stack
7. suba a stack:

```bash
bash infra/scripts/oracle-db-host-prepare.sh
bash infra/scripts/oracle-db-bootstrap.sh stanza-create
bash infra/scripts/oracle-db-bootstrap.sh up
```

## Comandos operacionais

```bash
bash infra/scripts/oracle-db-bootstrap.sh ps
bash infra/scripts/oracle-db-bootstrap.sh logs postgres
bash infra/scripts/oracle-db-network-guard.sh
bash infra/scripts/oracle-db-bootstrap.sh stanza-create
bash infra/scripts/oracle-db-bootstrap.sh backup-full
bash infra/scripts/oracle-db-bootstrap.sh backup-diff
bash infra/scripts/oracle-db-bootstrap.sh check
```

Túnel administrativo local:

```powershell
.\infra\scripts\oracle-db-tunnel.ps1
```

## BI e grants

- o schema `bi` é criado por migration da API
- o refresh das materialized views usa `apps/api/prisma/sql/refresh-bi.sql`
- o script operacional do host é `infra/oracle/db/scripts/refresh-bi.sh`
- o timer template fica em `infra/oracle/db/systemd/bi-refresh.timer`
- os grants de leitura do Metabase usam `infra/oracle/db/sql/grant-bi-reader.template.sql`
- o `DIRECT_URL` da aplicação deve usar o `MIGRATION_DB_USER`, não o superuser

## Runner AMD micro

A AMD micro da Lohana não entra no caminho crítico. O uso recomendado é:

- restore drill
- geração de `pgBadger`
- checagem de backup
- automação leve

Ela não deve hospedar PostgreSQL, Metabase ou Prometheus.

O material do runner fica em `infra/oracle/runner` e o bootstrap do host é `infra/scripts/oracle-runner-host-prepare.sh`.

O hardening comum de SSH/firewall fica em `infra/scripts/oracle-host-security-hardening.sh` e:

- desativa `X11Forwarding`
- mantém autenticação por chave
- limita `AllowTcpForwarding` a `local`
- instala `fail2ban`
- instala `ufw`
- desativa `rpcbind`

## Ajustes absorvidos de auditoria externa

Depois de revisar um stack alternativo all-in-one, os ajustes incorporados aqui foram apenas os de tuning que ajudam a Ampere sem piorar a arquitetura:

- `checkpoint_completion_target = 0.9`
- `wal_compression = on`
- `wal_buffers = 16MB`
- `random_page_cost = 1.1`
- `effective_io_concurrency = 200`
- autovacuum mais agressivo
- `track_io_timing = on`
- `log_autovacuum_min_duration = 1000`

O que foi **rejeitado** de propósito:

- expor BI/observabilidade por Caddy público
- concentrar banco + Metabase + Grafana + Loki na mesma VM
- substituir `pgBackRest` por backup lógico simples
- logs ruidosos de conexão/desconexão por padrão
