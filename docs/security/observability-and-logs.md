# Observability and Logs

## Objetivo

Garantir deteccao rapida de erros e falhas silenciosas sem degradar desempenho da aplicacao.

## Stack atual e transicao OSS

- logs estruturados: Pino
- erros aplicacionais: **Sentry** na API e no web, com Faro complementar no frontend
- tracing de runtime: OpenTelemetry na API via OTLP + tracing do Sentry nas superfícies web/api
- frontend OSS complementar: Grafana Faro no cliente web para sinais de UX e RUM leve
- pipeline OSS alvo: Alloy + Tempo + Loki + Prometheus + Alertmanager + Grafana

## Estado atual do caminho principal

- API Nest:
  - `@sentry/nestjs` inicializado cedo em `apps/api/src/instrument.ts`
  - `SentryModule.forRoot()` no `AppModule`
  - filtro global com captura de exceção para erros não tratados
- Web Next:
  - bootstrap client/server/edge com `@sentry/nextjs`
  - `withSentryConfig` no `next.config.ts`
  - upload de release/sourcemaps no build quando `SENTRY_AUTH_TOKEN` está presente
  - `global-error.tsx` capturando falha de renderização no App Router

Leitura correta:
- **Sentry é o caminho principal para erro e tracing distribuído**
- **Faro continua útil**, mas não substitui o pipeline principal de captura de exceção

## Guardrails de desempenho

- budget de tracing em producao: `OTEL_TRACES_SAMPLE_RATE=0.03`
- health checks nao devem poluir tracing de negocio
- exportacao assíncrona e nao bloqueante
- observabilidade sem endpoint configurado deve ficar desligada por default
- no frontend, Faro usa limite de sinais por janela + dedupe temporal de erros
- no frontend, coleta de request lenta e amostrada para reduzir overhead
- sourcemaps do Next so devem subir com `SENTRY_AUTH_TOKEN` valido e nunca ir para runtime

## Falhas silenciosas

Cobertura minima obrigatoria:

- backend: `unhandledRejection` e `uncaughtExceptionMonitor`
- frontend: detector E2E para `pageerror`, `console.error` nao ignoravel e `unhandledrejection`
- health probes + alerta para indisponibilidade recorrente
- correlacao por `requestId` entre logs, erro de cliente e traces de backend
- smoke local do Sentry no web deve validar browser -> tunnel e evento server-side

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
- queda de entrega de eventos Sentry ou falha recorrente de sourcemap/release no build

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
- `SENTRY_AUTH_TOKEN` deve existir apenas em build/CI; nao deve ficar no runtime do web
