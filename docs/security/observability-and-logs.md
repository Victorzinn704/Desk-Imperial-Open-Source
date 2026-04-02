# Observability and Logs

## Objetivo

Garantir deteccao rapida de erros e falhas silenciosas sem degradar desempenho da aplicacao.

## Stack atual e transicao OSS

- logs estruturados: Pino
- erros aplicacionais: Grafana Faro (frontend) + logs estruturados (backend)
- tracing OSS (fase 1): OpenTelemetry na API via OTLP
- frontend OSS (fase 2): Grafana Faro no cliente web
- pipeline OSS alvo: Alloy + Tempo + Loki + Prometheus + Alertmanager + Grafana

## Guardrails de desempenho

- budget de tracing em producao: `OTEL_TRACES_SAMPLE_RATE=0.03`
- health checks nao devem poluir tracing de negocio
- exportacao assíncrona e nao bloqueante
- observabilidade sem endpoint configurado deve ficar desligada por default
- no frontend, Faro usa limite de sinais por janela + dedupe temporal de erros
- no frontend, coleta de request lenta e amostrada para reduzir overhead

## Falhas silenciosas

Cobertura minima obrigatoria:

- backend: `unhandledRejection` e `uncaughtExceptionMonitor`
- frontend: detector E2E para `pageerror`, `console.error` nao ignoravel e `unhandledrejection`
- health probes + alerta para indisponibilidade recorrente
- correlacao por `requestId` entre logs, erro de cliente e traces de backend

## Tipos de logs

### Application logs

- metodo HTTP
- rota
- status code
- duracao
- requestId
- erro resumido

### Audit logs

- usuario
- acao
- recurso afetado
- timestamp
- IP mascarado ou tratado conforme politica
- user agent

### Security logs

- falha de login
- tentativa suspeita
- bloqueio de acesso
- aceite de termo
- troca de credencial

## Alertas minimos

- pico de `5xx`
- queda do health check (probe HTTP com blackbox)
- aumento anormal de falhas de login
- tempo de resposta acima do esperado
- crescimento continuo de timeout/retry no auth

Governanca recomendada:

- dashboards versionados no repositorio e provisionados automaticamente
- alertas declarativos no Prometheus (`alert.rules.yml`) com severidade consistente
- cobertura minima de disponibilidade: Alloy, Tempo, Loki, Prometheus, Alertmanager, Grafana e blackbox

## Cuidados

- sem senha em log
- sem token completo em log
- sem CPF completo em log
- retencao de logs com politica definida
- evitar labels de alta cardinalidade em traces/logs
- collector Faro em producao deve ser HTTPS
- redigir campos sensiveis antes de envio de eventos do browser
