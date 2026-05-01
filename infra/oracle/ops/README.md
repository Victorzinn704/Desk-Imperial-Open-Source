# Oracle Ops Stack — Observabilidade, SonarQube e Metabase

Esta pasta materializa a camada operacional da `vm-free-02`.

## Topologia

| VM                    | Papel       | Serviços                                                                                                                   |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `vm-free-01`          | Produção    | `web`, `api`, `redis`, `nginx`, `certbot`, `node-exporter` privado                                                         |
| `vm-free-02`          | Ops/Builder | `Grafana`, `Prometheus`, `Loki`, `Tempo`, `Alloy`, `Alertmanager`, `Blackbox`, `SonarQube`, `registry privado`, `Metabase` |
| `lohana-ampere-01`    | Banco       | `PostgreSQL 17`, `PgBouncer`, `pgBackRest`, `postgres_exporter`, `node-exporter`                                           |
| `lohana-amd-micro-01` | Runner      | restore drill, relatórios `pgBadger`, checagem de backup                                                                   |
| `vm-amd-micro-01`     | Sentinela   | healthcheck externo leve                                                                                                   |

## Segurança

- UIs de Grafana, Prometheus, Alertmanager, Alloy, Loki, Tempo e SonarQube ficam presas em `127.0.0.1` na `vm-free-02`.
- Metabase também fica preso em `127.0.0.1`.
- A ingestão OTLP do Alloy fica no IP privado da VCN (`OPS_PRIVATE_IP`) para a API enviar telemetria sem expor porta pública.
- Os scrapes do banco chegam por IP privado WireGuard; não use IP público nem abra `5432` na internet.
- O acesso humano deve ser feito por túnel SSH.
- O `node-exporter` da produção fica preso em `127.0.0.1` na `vm-free-01`; o Prometheus acessa por um proxy SSH interno no compose da `vm-free-02`.
- As credenciais reais devem ficar fora do repositório, em secret manager ou arquivo local ignorado pelo Git.
- Exposição pública aceitável neste host:
  - `22/tcp` para SSH administrativo
  - `51820/udp` se o host participar da malha WireGuard

Nada de Grafana, Metabase, Prometheus, SonarQube, Loki ou Tempo em porta pública.

## Portas via túnel

```powershell
ssh -i $env:TEMP\desk_oci_key.pem `
  -L 3001:127.0.0.1:3001 `
  -L 3002:127.0.0.1:3002 `
  -L 9090:127.0.0.1:9090 `
  -L 9093:127.0.0.1:9093 `
  -L 9000:127.0.0.1:9000 `
  -L 12345:127.0.0.1:12345 `
  <OPS_HOST>
```

Depois do túnel:

- Grafana: `http://localhost:3001`
- Metabase: `http://localhost:3002`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- SonarQube: `http://localhost:9000`
- Alloy UI: `http://localhost:12345`
- Loki API: `http://localhost:3100`
- Tempo API: `http://localhost:3200`

Atalho do repositório:

```powershell
.\infra\scripts\oracle-ops-tunnel.ps1
```

## Variáveis de produção recomendadas para a API

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://<OPS_PRIVATE_IP>:4318
OTEL_TRACES_SAMPLE_RATE=0.03
OTEL_METRICS_EXPORT_INTERVAL_MS=15000
OTEL_SERVICE_NAME=desk-imperial-api
OTEL_SERVICE_ENVIRONMENT=production
OTEL_DIAGNOSTICS=false
```

O frontend Faro continua dependente de um collector HTTPS público. Não aponte `NEXT_PUBLIC_FARO_COLLECTOR_URL` para IP privado.

## Operação

Subir ou atualizar a stack na `vm-free-02`:

```bash
sudo bash infra/scripts/oracle-ops-host-prepare.sh
cd /opt/desk-ops
docker compose --env-file .env up -d
```

Validar targets do Prometheus:

```bash
curl -fsS http://127.0.0.1:9090/api/v1/targets
```

Serviços esperados como `up`:

- `alloy`
- `prometheus`
- `tempo`
- `loki`
- `alertmanager`
- `grafana`
- `blackbox`
- `desk-api-health`
- `desk-app-health`
- `sonarqube-health`
- `oracle-node-exporter` para `vm-free-01` e `vm-free-02`
- `desk-db-node-exporter` para a Ampere da Lohana
- `desk-db-postgres-exporter` para a Ampere da Lohana
- `metabase`

Os alertas de banco também passam a depender das métricas textfile de backup expostas pelo `node-exporter` da Ampere.

## SonarQube

- URL via túnel: `http://localhost:9000`
- Project key: `desk-imperial`
- Token de CI: manter somente em secret manager ou arquivo local ignorado pelo Git

Como o SonarQube está privado por segurança, um runner GitHub hospedado pela própria GitHub não enxerga esse endpoint diretamente. Para CI contínuo, use um destes caminhos:

1. runner self-hosted dentro da Oracle/VCN;
2. túnel controlado durante o job;
3. exposição por proxy autenticado e restrito.
