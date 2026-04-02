# Troubleshooting Guide

## 1. Login ou sessao falhando

Sintomas comuns:

- 401 em rotas autenticadas
- sessao nao persiste entre requests

Checklist:

1. confirmar APP_URL e NEXT_PUBLIC_APP_URL corretos
2. validar COOKIE_SECRET e CSRF_SECRET (sem placeholder `change-me`)
3. conferir se browser aceita cookies para o dominio
4. validar origem permitida no CORS

## 2. Erro CSRF em mutacao

Sintomas comuns:

- 403 em POST/PATCH/DELETE
- mensagem de token CSRF ausente/invalido

Checklist:

1. garantir login ativo (sessao valida)
2. confirmar envio de header X-CSRF-Token
3. validar cookie CSRF presente
4. conferir origin/referer permitidos

No frontend web, mutacoes via `apiFetch` ja incluem CSRF automaticamente quando o token esta presente.

## 3. Endpoint de market intelligence falhando

Contrato atual:

- rota: POST /api/market-intelligence/insights
- protecao: SessionGuard + CsrfGuard

Erros frequentes:

- 401: sessao ausente
- 403: CSRF invalido/ausente
- 429: limite de uso da IA excedido
- 503/502: indisponibilidade da integracao Gemini

Acoes:

1. validar GEMINI_API_KEY
2. checar limites GEMINI_MAX_REQUESTS/GEMINI_WINDOW_MINUTES
3. revisar logs de timeout e resposta do provider externo

## 4. Redis indisponivel

Impacto:

- degradacao de cache
- rate limit inconsistente
- risco de divergencia de fanout realtime em escala horizontal

Checklist:

1. validar REDIS_URL
2. confirmar conectividade de rede
3. checar health endpoint da API

## 5. Prisma migration bloqueada

Se ocorrer migration failed (ex.: P3009), seguir fluxo:

1. resolver migration como rolled-back
2. reaplicar deploy de migration

Comandos usuais no workspace da API:

```bash
npx prisma migrate resolve --rolled-back <migration>
npx prisma migrate deploy
```

## 6. Realtime nao atualiza no cliente

Checklist:

1. confirmar sessao ativa
2. validar conexao socket no namespace /operations
3. verificar se eventos chegam no gateway
4. conferir fallback de invalidacao no frontend

Se houver multiplas instancias, Redis adapter deve estar ativo.

## 7. PWA/offline inconsistente

Checklist:

1. confirmar registro de service worker no modulo /app
2. limpar cache do navegador apos mudanca de versao
3. verificar suporte de Background Sync no browser alvo

Observacao:

- a cobertura offline e focada no fluxo operacional do modulo app.

## 8. CI falhando no gate principal

O CI principal executa quality, backend-tests, frontend-unit, frontend-e2e, security e build.

Para depurar:

1. reproduzir comando do job localmente
2. validar versao Node 22
3. revisar artefatos de cobertura e playwright report

## 9. Observabilidade OSS sem eventos

Checklist:

1. validar `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` ou `OTEL_EXPORTER_OTLP_ENDPOINT` na API
2. confirmar collector Faro (`NEXT_PUBLIC_FARO_COLLECTOR_URL`) no frontend
3. checar se a CSP inclui o dominio do collector Faro em `connect-src`
4. validar `NEXT_PUBLIC_FARO_SAMPLE_RATE` e `OTEL_TRACES_SAMPLE_RATE`
5. conferir conectividade entre API e Alloy/OTLP

Observacao:

- a API envia traces OTLP para Alloy/Tempo
- o Web envia erros/eventos para Faro conforme amostragem de sessao

## 10. OpenTelemetry (OTLP) sem traces

Checklist:

1. confirmar `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` ou `OTEL_EXPORTER_OTLP_ENDPOINT`
2. validar endpoint de traces com sufixo `/v1/traces` (quando ausente, a API completa automaticamente)
3. conferir `OTEL_TRACES_SAMPLE_RATE` no ambiente (producao recomendado: `0.03`)
4. validar headers OTLP quando exigido (`OTEL_EXPORTER_OTLP_HEADERS`)
5. conferir conectividade da API para o coletor Alloy/OTLP

Observacao:

- sem endpoint OTLP configurado, OpenTelemetry fica desabilitado por design (sem overhead desnecessario)

## 11. Faro sem eventos no frontend

Checklist:

1. validar `NEXT_PUBLIC_FARO_COLLECTOR_URL` no deploy/build
2. conferir `NEXT_PUBLIC_FARO_SAMPLE_RATE` (recomendado: `0.03`)
3. validar se a CSP permite o dominio do collector Faro em `connect-src`
4. conferir se a aplicacao esta em sessao amostrada (sessionTracking)
5. validar erro real no browser e checar ingestao no Grafana

Checks adicionais de hardening:

6. em producao, garantir collector com `https://` (HTTP e bloqueado automaticamente)
7. revisar `NEXT_PUBLIC_FARO_MAX_SIGNALS_PER_MINUTE` se houver throttle excessivo
8. revisar `NEXT_PUBLIC_FARO_ERROR_DEDUPE_WINDOW_MS` se eventos iguais estiverem sendo agrupados demais
9. ajustar `NEXT_PUBLIC_FARO_SLOW_API_THRESHOLD_MS` para o budget de latencia do ambiente

## 12. Falhas silenciosas detectadas no E2E crítico

Sintomas comuns:

- suite `test:e2e:critical` falha com `pageerror`, `console.error` ou `unhandledrejection`

Checklist:

1. rodar novamente em headed para reproduzir visualmente (`npm --workspace @partner/web run test:e2e:headed`)
2. inspecionar stack trace no output do Playwright
3. validar se erro nao foi introduzido por mock de rota no proprio teste
4. revisar boundaries globais (`app/error.tsx` e `app/global-error.tsx`)

## 13. k6 nao encontrado no ambiente

Sintoma:

- erro `k6: The term 'k6' is not recognized`

Checklist:

1. instalar o binario do k6 no host/runner
2. validar instalacao com `k6 version`
3. rerodar `npm run test:load:critical`

## 14. Latency gate falhando no CI

Checklist:

1. validar se a API inicializou no job (`api-latency-gate.log`)
2. confirmar migrations aplicadas no banco de teste
3. reproduzir localmente com `npm run test:load:ci`
4. revisar thresholds do script `tests/load/k6/ci-latency-gate.js`

## 15. Quando abrir incidente

Abrir incidente quando houver:

- falha recorrente em auth/csrf
- divergencia operacional com impacto em caixa/comanda/cozinha
- falha de CI bloqueando entrega sem causa clara

## 16. Warning de `--localstorage-file` em testes

Sintoma:

- warning do Node informando `--localstorage-file` sem caminho valido durante `npm run test`

Status atual:

- os scripts de teste (root/API/Web) usam runner com sanitizacao de `NODE_OPTIONS`
- flags invalidas de `--localstorage-file` sao removidas automaticamente antes de executar Jest/Vitest/Turbo

Checklist:

1. confirmar uso dos scripts npm oficiais de teste (nao chamar binarios diretamente)
2. validar se nao existe `NODE_OPTIONS` custom no shell local/CI
3. se o warning persistir, registrar o valor bruto de `NODE_OPTIONS` no runner para diagnostico

## 17. Grafana sem dashboard provisionado

Sintomas comuns:

- Grafana sobe sem painel inicial de observabilidade
- pasta `Desk Observability` nao aparece

Checklist:

1. confirmar volume de provisionamento no compose (`docker-compose.observability.yml`)
2. validar existencia dos arquivos:
   - `infra/docker/observability/grafana/provisioning/dashboards/dashboards.yml`
   - `infra/docker/observability/grafana/dashboards/observability-overview.json`
3. reiniciar apenas o Grafana: `docker compose -f infra/docker/docker-compose.observability.yml restart grafana`
4. confirmar logs do Grafana para erro de parse de JSON/YAML

## 18. Logs de Redis em fail-open no backend

Sintomas comuns:

- log: `Redis apresentou 3 falhas consecutivas (...) Cache desligado permanentemente via Fail Open.`
- health degradado com `db=true redis=false` ou `db=false redis=true`

Causa mais comum:

- Redis nao iniciado/local inacessivel para `REDIS_URL`

Checklist:

1. validar `REDIS_URL` no `.env` (default local: `redis://localhost:6379`)
2. subir stack local de infraestrutura: `npm run db:up`
3. validar containers `postgres` e `redis` ativos no compose local
4. reiniciar API e revalidar `GET /api/health`

Observacao:

- em testes unitarios, parte desses logs pode aparecer como cenario esperado de resiliencia (fail-open)

## 19. Deploy Web no Railway falha com @tailwindcss/oxide

Sintomas comuns:

- build do web quebra com `Cannot find native binding`
- erro em cascata para `Cannot find module '@tailwindcss/oxide-linux-x64-gnu'`

Causa mais comum:

- bug conhecido do npm com dependencias opcionais em alguns cenarios de `npm ci` no build remoto

Mitigacao aplicada no projeto:

- o script `infra/scripts/railway-build.sh` garante a instalacao de `@tailwindcss/oxide-linux-x64-gnu` no Linux antes do `next build`

Checklist:

1. confirmar que o deploy esta usando o script `infra/scripts/railway-build.sh`
2. validar nos logs a linha `Ensuring @tailwindcss/oxide-linux-x64-gnu@... is installed`
3. se ainda falhar, forcar novo deploy sem cache
