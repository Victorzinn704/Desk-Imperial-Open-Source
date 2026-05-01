# Sentry Rollout — 2026-05-01

**Versao:** 1.0  
**Ultima atualizacao:** 2026-05-01

## Escopo

Este runbook cobre o rollout atual do Sentry no Desk Imperial para:

- `apps/api` (NestJS)
- `apps/web` (Next.js, client/server/edge)
- build do web com sourcemaps
- smoke local do web

O objetivo aqui nao e explicar a teoria do Sentry. E registrar como o runtime do projeto esta ligado hoje.

---

## 1. Superficies integradas

### API (`apps/api`)

Arquivos principais:

- `apps/api/src/instrument.ts`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`

Estado atual:

- inicializacao cedo via `import './instrument'`
- `SentryModule.forRoot()` no `AppModule`
- filtro global com `@SentryExceptionCaptured()`
- profiling Node habilitado via `@sentry/profiling-node`
- integracao com OTel customizado do projeto

### Web (`apps/web`)

Arquivos principais:

- `apps/web/instrumentation-client.ts`
- `apps/web/instrumentation.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/web/lib/observability/sentry.ts`
- `apps/web/app/global-error.tsx`
- `apps/web/next.config.ts`

Estado atual:

- client, server e edge inicializados separadamente
- `global-error.tsx` captura excecao de render no App Router
- build do Next usa `withSentryConfig`
- tunnel `/sentry-tunnel` ativo
- sourcemaps habilitados quando `SENTRY_AUTH_TOKEN` existe

---

## 2. Variaveis de ambiente

### API

```env
SENTRY_DSN=
SENTRY_ENABLED=true
SENTRY_ENABLE_LOGS=false
SENTRY_SEND_DEFAULT_PII=false
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILE_SESSION_SAMPLE_RATE=0.02
SENTRY_PROFILE_LIFECYCLE=trace
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
```

### Web runtime

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENABLED=true
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_RELEASE=
NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII=false
NEXT_PUBLIC_SENTRY_ENABLE_LOGS=false
SENTRY_WEB_DSN=
SENTRY_WEB_ENABLED=true
SENTRY_WEB_TRACES_SAMPLE_RATE=0.1
SENTRY_WEB_ENVIRONMENT=development
SENTRY_WEB_RELEASE=
SENTRY_WEB_SEND_DEFAULT_PII=false
SENTRY_WEB_ENABLE_LOGS=false
```

### Build / sourcemaps

```env
SENTRY_ORG=desk-imperial
SENTRY_PROJECT_WEB=javascript-nextjs
SENTRY_AUTH_TOKEN=
```

Regras atuais:

- `SENTRY_AUTH_TOKEN` e necessario apenas no build do web para release/sourcemaps
- `NEXT_PUBLIC_SENTRY_DSN` alimenta o browser
- `SENTRY_WEB_DSN` pode sobrescrever o DSN server/edge do web
- sem DSN, a app continua de pe; apenas nao envia eventos

---

## 3. Comportamento atual do build do web

`apps/web/next.config.ts` hoje usa:

- `withSentryConfig`
- `tunnelRoute: '/sentry-tunnel'`
- `sourcemaps.disable = !process.env.SENTRY_AUTH_TOKEN`
- `authToken: process.env.SENTRY_AUTH_TOKEN`

Implicacao pratica:

- sem token, o build continua
- com token, o build sobe release e sourcemaps

---

## 4. Smoke local do web

Script atual:

```bash
npm --workspace @partner/web run smoke:sentry
```

O smoke:

1. exige build pronto do Next
2. sobe `next start` em porta isolada
3. habilita a superficie de teste via `SENTRY_EXAMPLE_ENABLED=true`
4. navega na page de exemplo
5. valida erro de browser indo para `/sentry-tunnel`
6. valida erro server-side pela rota de exemplo
7. grava relatorio em `apps/web/.cache/sentry/`

Arquivo principal:

- `apps/web/scripts/sentry-smoke.mjs`

Superficies de teste:

- `apps/web/app/sentry-example-page/page.tsx`
- `apps/web/app/api/sentry-example-api/route.ts`

---

## 5. Sequencia recomendada de rollout

### API

1. preencher `SENTRY_DSN`
2. validar bootstrap da API
3. validar captura de excecao global

### Web runtime

1. preencher `NEXT_PUBLIC_SENTRY_DSN`
2. opcionalmente preencher `SENTRY_WEB_DSN`
3. rodar `npm --workspace @partner/web run build`
4. rodar `npm --workspace @partner/web run smoke:sentry`

### Web build com sourcemaps

1. preencher `SENTRY_AUTH_TOKEN`
2. garantir `SENTRY_ORG` e `SENTRY_PROJECT_WEB`
3. rodar build do web
4. validar que o build reportou upload de sourcemaps

---

## 6. Guardrails atuais

- nao versionar `SENTRY_AUTH_TOKEN`
- nao ligar `sendDefaultPii=true` sem necessidade clara
- nao forcar `tracesSampleRate=1` em producao por padrao
- nao usar `next dev` para smoke automatizado pesado neste repo
- manter o runtime do web com DSN separado de build token

---

## 7. Problemas comuns

### `401 Invalid token` no build

Causa:

- `SENTRY_AUTH_TOKEN` invalido ou copiado do lugar errado

Correcao:

- usar token real de API/CLI
- validar org/projeto

### Sentry do browser nao recebe nada

Verifique:

- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENABLED`
- CSP / tunnel
- smoke local do web

### API nao envia erro

Verifique:

- `SENTRY_DSN`
- `SENTRY_ENABLED`
- `apps/api/src/instrument.ts`
- `HttpExceptionFilter` registrado

### Sourcemap nao sobe

Verifique:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT_WEB`
- build do `apps/web`

---

## 8. Definition of done desta trilha

1. API inicializa com Sentry habilitado
2. Web inicializa em client/server/edge
3. `smoke:sentry` passa localmente
4. build do web sobe sourcemaps quando token existe
5. segredos ficam fora de arquivos versionados
