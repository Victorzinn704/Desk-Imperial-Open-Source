# Sentry Rollout - 2026-05-01

## Objetivo

Documentar a trilha publica de observabilidade com Sentry no Desk Imperial sem expor segredo, token ou detalhe operacional sensivel.

## Escopo desta passada

O rollout cobre dois alvos:

1. **web / Next.js**
2. **api / NestJS**

Tambem cobre:

- release no build
- upload de sourcemaps
- smoke seguro de validacao

## Web / Next.js

O web usa o SDK do Sentry nos tres ambientes de runtime do Next:

- client
- server
- edge

Pontos de integracao:

- bootstrap por `instrumentation-client.ts`
- registro por `instrumentation.ts`
- configuracoes separadas para server e edge
- captura de erro global no App Router
- tunnel dedicado para reduzir interferencia de ad blockers

## API / NestJS

A API usa o SDK do Sentry no bootstrap do Nest com captura o mais cedo possivel.

Pontos de integracao:

- inicializacao em arquivo dedicado antes do bootstrap principal
- `SentryModule` no modulo raiz
- captura de excecao no filtro global
- integracao com OpenTelemetry existente do backend

## Release e sourcemaps

O upload de sourcemaps e feito no build com `SENTRY_AUTH_TOKEN`.

Regras:

- o token nao deve ir para o runtime
- o token deve existir apenas no ambiente de build/CI
- o runtime precisa apenas do DSN

## Variaveis de ambiente

### Web

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_AUTH_TOKEN` (somente build)

### API

- `SENTRY_DSN`
- `SENTRY_ENABLED`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`
- `SENTRY_PROFILE_SESSION_SAMPLE_RATE`

## Smoke de validacao

Para este monorepo, o smoke seguro do Sentry no web nao deve subir `next dev` junto com Playwright.

Fluxo recomendado:

1. `next build`
2. `next start` em porta isolada
3. smoke curto para browser + endpoint de exemplo

Motivo:

- `next dev` com Turbopack neste repo consome memoria demais para smoke automatizado

## Regras de seguranca

- nao commitar `SENTRY_AUTH_TOKEN`
- nao commitar DSN privado ou secret key fora do lugar certo
- rotacionar token se ele for exposto em conversa, log ou terminal compartilhado
- preferir secret do CI para build publico

## Resultado esperado

Quando o rollout esta correto:

- erros do browser chegam ao projeto web no Sentry
- erros do Nest chegam ao projeto da API
- releases aparecem no painel
- stack trace usa sourcemaps validos
