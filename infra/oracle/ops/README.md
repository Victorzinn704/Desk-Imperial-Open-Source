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
