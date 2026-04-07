# Oracle Ops Stack — Observabilidade e SonarQube

Esta pasta materializa a camada operacional da `vm-free-02`.

## Topologia

| VM                | Papel       | Serviços                                                                                                                       |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `vm-free-01`      | Produção    | `web`, `api`, `redis`, `nginx`, `certbot`, `node-exporter` privado                                                             |
| `vm-free-02`      | Ops/Builder | `Grafana`, `Prometheus`, `Loki`, `Tempo`, `Alloy`, `Alertmanager`, `Blackbox`, `SonarQube`, `Postgres Sonar`, registry privado |
| `vm-amd-micro-01` | Sentinela   | healthcheck externo leve                                                                                                       |

## Segurança

- UIs de Grafana, Prometheus, Alertmanager, Alloy, Loki, Tempo e SonarQube ficam presas em `127.0.0.1` na `vm-free-02`.
- A ingestão OTLP do Alloy fica no IP privado da VCN (`OPS_PRIVATE_IP`) para a API enviar telemetria sem expor porta pública.
- O acesso humano deve ser feito por túnel SSH.
- O `node-exporter` da produção fica preso em `127.0.0.1` na `vm-free-01`; o Prometheus acessa por um proxy SSH interno no compose da `vm-free-02`.
- As credenciais reais ficam em `/opt/desk-ops/credentials.txt` na VM e na cópia local ignorada pelo Git em `.secrets/ops-credentials.txt`.

## Portas via túnel

```powershell
ssh -i $env:TEMP\desk_oci_key.pem `
  -L 3001:127.0.0.1:3001 `
  -L 9090:127.0.0.1:9090 `
  -L 9093:127.0.0.1:9093 `
  -L 9000:127.0.0.1:9000 `
  -L 12345:127.0.0.1:12345 `
  ubuntu@147.15.60.224
```

Depois do túnel:

- Grafana: `http://localhost:3001`
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
OTEL_EXPORTER_OTLP_ENDPOINT=http://10.10.1.166:4318
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

## SonarQube

- URL via túnel: `http://localhost:9000`
- Project key: `desk-imperial`
- Token de CI: salvo em `.secrets/ops-credentials.txt` e `/opt/desk-ops/credentials.txt`

Como o SonarQube está privado por segurança, um runner GitHub hospedado pela própria GitHub não enxerga esse endpoint diretamente. Para CI contínuo, use um destes caminhos:

1. runner self-hosted dentro da Oracle/VCN;
2. túnel controlado durante o job;
3. exposição por proxy autenticado e restrito.
