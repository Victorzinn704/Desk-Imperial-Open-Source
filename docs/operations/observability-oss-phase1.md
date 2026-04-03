# Observabilidade OSS Fase 1 (API)

## Escopo

Fase inicial da migracao para stack OSS com foco em baixo overhead:

- OpenTelemetry na API (NestJS)
- Exportacao OTLP de traces, metricas e logs
- Roteamento central via Alloy para Tempo (traces), Loki (logs) e Prometheus (metricas)
- Sampling conservador em producao
- Captura de falhas silenciosas mantida no processo

## Estado atual

- Ativacao via variavel de ambiente (opt-in)
- Sem endpoint OTLP configurado, telemetria OSS fica desabilitada
- Valor recomendado em producao: `OTEL_TRACES_SAMPLE_RATE=0.03`
- A API ja possui inicializacao real de OpenTelemetry no bootstrap
- O frontend ja possui Grafana Faro integrado ao runtime e aos boundaries de erro
- O stack local provisiona Alloy, Tempo, Loki, Prometheus, Alertmanager, Grafana e Blackbox
- O collector do frontend ainda nao esta fechado dentro do compose do repositorio; `NEXT_PUBLIC_FARO_COLLECTOR_URL` continua sendo dependencia explicita de ambiente

## Variaveis de ambiente

```env
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_TRACES_SAMPLE_RATE=0.03
OTEL_METRICS_EXPORT_INTERVAL_MS=15000
OTEL_SERVICE_NAME=desk-imperial-api
OTEL_SERVICE_ENVIRONMENT=production
OTEL_DIAGNOSTICS=false
```

Notas:

- Use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` para endpoint dedicado de traces.
- Use `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` para endpoint dedicado de metricas.
- Use `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` para endpoint dedicado de logs.
- Se usar apenas `OTEL_EXPORTER_OTLP_ENDPOINT`, a API completa com `/v1/traces`.
- Se usar apenas `OTEL_EXPORTER_OTLP_ENDPOINT`, a API completa automaticamente com `/v1/traces`, `/v1/metrics` e `/v1/logs`.
- `OTEL_EXPORTER_OTLP_HEADERS` aceita pares no formato `key=value,key2=value2`.

## Exemplo local com Alloy

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_TRACES_SAMPLE_RATE=0.03
OTEL_METRICS_EXPORT_INTERVAL_MS=15000
OTEL_SERVICE_NAME=desk-imperial-api
OTEL_SERVICE_ENVIRONMENT=development
```

Subir stack OSS local:

```bash
npm run obs:up
```

Endpoints locais:

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Tempo API: `http://localhost:3200`
- OTLP ingest (Alloy): `http://localhost:4318/v1/traces`
- OTLP ingest metricas (Alloy): `http://localhost:4318/v1/metrics`
- OTLP ingest logs (Alloy): `http://localhost:4318/v1/logs`
- Alloy metrics/UI: `http://localhost:12345`
- Blackbox exporter: `http://localhost:9115`

Observacao importante sobre login do Grafana local:

- se o volume `grafana-data` ja existia antes, o usuario/senha persistidos podem continuar valendo mesmo que o compose tenha novos defaults
- no estado local atual, o login ativo continua `admin/admin`
- para alinhar com os novos defaults do compose, sera preciso resetar o volume ou trocar a senha explicitamente

## Fase 2 (Frontend Faro) - hardening

Estado real desta fase hoje:

- cliente Faro implementado no codigo web
- CSP preparada para liberar o dominio do collector
- limitadores de ruido e sanitizacao aplicados no cliente
- ingestao do browser ainda depende de um collector configurado fora do stack local atual

Consequencia pratica:

- sem `NEXT_PUBLIC_FARO_COLLECTOR_URL` valido no ambiente, o frontend continua seguro, mas nao envia eventos
- a stack local atual cobre bem API/infra, porem ainda nao fecha sozinha a trilha browser -> collector -> Grafana

Variaveis recomendadas:

```env
NEXT_PUBLIC_FARO_COLLECTOR_URL=https://seu-collector-faro/collect
NEXT_PUBLIC_FARO_APP_NAME=desk-imperial-web
NEXT_PUBLIC_FARO_APP_VERSION=0.1.0
NEXT_PUBLIC_FARO_ENVIRONMENT=production
NEXT_PUBLIC_FARO_EVENT_DOMAIN=desk-imperial-web
NEXT_PUBLIC_FARO_SAMPLE_RATE=0.03
NEXT_PUBLIC_FARO_CAPTURE_CONSOLE=false
NEXT_PUBLIC_FARO_MAX_SIGNALS_PER_MINUTE=120
NEXT_PUBLIC_FARO_ERROR_DEDUPE_WINDOW_MS=30000
NEXT_PUBLIC_FARO_BATCH_SEND_TIMEOUT_MS=5000
NEXT_PUBLIC_FARO_BATCH_ITEM_LIMIT=30
NEXT_PUBLIC_FARO_TRANSPORT_CONCURRENCY=4
NEXT_PUBLIC_FARO_TRANSPORT_BACKOFF_MS=30000
NEXT_PUBLIC_FARO_SLOW_API_THRESHOLD_MS=1200
NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE=0.1
NEXT_PUBLIC_FARO_ALLOW_INSECURE_COLLECTOR=false
```

Regras de seguranca aplicadas:

- em producao, collector nao-HTTPS e bloqueado automaticamente
- campos sensiveis (`token`, `authorization`, `password`, `cookie`, `email`, `cpf`, `cnpj`) sao redigidos
- paths sao sanitizados para reduzir cardinalidade e vazamento de identificadores

Regras de desempenho aplicadas:

- limitador de sinais por janela para evitar flood no cliente
- deduplicacao temporal de erros repetidos
- envio em lote com limites conservadores
- metricas de latencia com foco em request lenta/erro e amostragem de saudavel

## Governanca de dashboards e alertas (fase 2.1)

Provisionamento automatico no Grafana:

- provider de dashboards: `infra/docker/observability/grafana/provisioning/dashboards/dashboards.yml`
- dashboard base: `infra/docker/observability/grafana/dashboards/observability-overview.json`
- datasources provisionados: `infra/docker/observability/grafana/provisioning/datasources/datasources.yml`

Prometheus e regras:

- scrape de `alloy`, `tempo`, `loki`, `prometheus`, `alertmanager`, `grafana` e `blackbox`
- health da API via probe HTTP real (`desk-api-health`) com blackbox exporter
- alertas para indisponibilidade de serviços de observabilidade
- alerta para falha recorrente do probe de health da API

Limitacoes atuais:

- dashboard provisionado hoje e mais forte em saude da infraestrutura do que em fluxo de produto
- Alertmanager ainda nao sai para destino externo por padrao
- o probe `desk-api-health` pressupoe a API local respondendo em `http://host.docker.internal:4000/api/health`

Arquivos de referencia:

- compose observability: `infra/docker/docker-compose.observability.yml`
- scrape config: `infra/docker/observability/prometheus/prometheus.yml`
- alertas: `infra/docker/observability/prometheus/alert.rules.yml`
- blackbox module: `infra/docker/observability/blackbox/blackbox.yml`

## Checklist de rollout

1. configurar endpoint OTLP em staging
2. iniciar com `OTEL_TRACES_SAMPLE_RATE=0.01`
3. validar latencia e erro por 24h
4. subir para `0.03` se budget continuar estavel
5. publicar alerta para indisponibilidade do coletor

## Budget de desempenho recomendado

- delta p95 de latencia: <= 10ms
- delta CPU: <= 2%
- delta RAM: <= 5%

## Rollback rapido

1. remover `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`/`OTEL_EXPORTER_OTLP_ENDPOINT`
2. reiniciar API
3. confirmar que traces OSS pararam e app voltou ao baseline

Para desligar a stack local:

```bash
npm run obs:down
```

## Proxima fase

- enriquecer labels de logs no Alloy com contexto de dominio por modulo
- adicionar metricas de negocio (RED) no backend para dashboards de produto
- ampliar alertas com SLO de latencia/erro de API
- fechar collector do frontend dentro do desenho oficial da stack
- publicar dashboards separados para browser, auth e operacao
