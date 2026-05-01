# Testing Guide

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

## 1. Escopo

Este guia descreve a estrategia de testes atual do Desk Imperial para backend, frontend, smoke operacional e gates de CI.

## 1.1 Testes como documentacao

Neste projeto, testes tambem funcionam como documentacao de comportamento. Isso e especialmente importante para codigo aberto sob licenca MIT, porque ajuda usuarios e contribuidores a entender:

- contratos de regra de negocio
- fronteiras de autorizacao
- cenarios de erro esperados
- efeitos colaterais (cache, auditoria, realtime)

Guia pratico da API: `apps/api/test/README.md`.

## 2. Stack de testes

### Backend

- Jest
- `@nestjs/testing`
- suites unitarias e de servico
- smoke HTTP/e2e de API

### Frontend

- Vitest (unit/component/hook)
- Playwright (E2E baseline em Chromium)
- smoke dedicado de Sentry no `apps/web`

### Performance

- `k6` para gates curtos de latencia
- smokes operacionais em scripts do monorepo

## 3. Comandos principais

### Monorepo

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run quality:preflight
npm run test:critical
```

### Backend

```bash
npm --workspace @partner/api run test
npm --workspace @partner/api run test:e2e
npm --workspace @partner/api run build:verify
```

### Frontend

```bash
npm --workspace @partner/web run test
npm --workspace @partner/web run test:critical
npm --workspace @partner/web run test:e2e
npm run test:e2e:critical
npm --workspace @partner/web run smoke:sentry
npm --workspace @partner/web run build
```

### Carga

```bash
npm run test:load:critical
npm run test:load:ci
```

## 4. Cobertura por objetivo

- Backend: regras de negocio, guards, servicos criticos e smoke HTTP.
- Frontend unit: hooks/componentes de operacao e shells principais.
- Frontend E2E baseline: autenticacao e navegacao critica.
- Frontend E2E critico: guardas contra falhas silenciosas (`pageerror`, `console.error`, `unhandledrejection`).
- Load critico: metas de latencia p95/p99 para health e login.
- Gate de performance no CI: `k6` de curta duracao para bloquear regressao de latencia.
- Observabilidade: smoke dedicado para validar runtime e captura do Sentry no web.

## 5. CI (gates obrigatorios)

O repositorio hoje tem dois trilhos de CI principais.

### `.github/workflows/ci.yml`

Pipeline de produto e entrega. Executa:

1. quality (lint + typecheck + openapi)
2. backend-tests
3. backend-e2e
4. frontend-unit
5. frontend-e2e (Chromium baseline)
6. security checks
7. performance latency gate
8. build

### `.github/workflows/quality.yml`

Pipeline de qualidade estrutural. Executa:

1. fast-checks (Biome + Prettier)
2. lint-repo
3. lint-api / lint-web
4. architecture (depcruise, cycles, knip, duplication)
5. secrets / sast / sca
6. tests + coverage
7. qodana

`ci.yml` protege a entrega. `quality.yml` protege governanca tecnica, arquitetura e drift.

## 6. Regras para PR e refactor

Antes de abrir PR ou consolidar um refactor:

- executar testes da area alterada
- validar typecheck
- garantir que mudancas de contrato API tenham teste associado
- anexar contexto de regressao quando o fluxo for sensivel
- para auth, realtime, financeiro, deploy e producao, preferir `npm run quality:preflight`

## 7. Testes recomendados por tipo de mudanca

- Auth/seguranca: suites de auth + guards + smoke de login/logout.
- Operacao/realtime: services operacionais + hooks de sincronizacao + smoke owner/staff quando aplicavel.
- Finance/comercial: agregacoes e mutacoes com impacto em KPI.
- UI critica: unit + E2E baseline no fluxo afetado.
- Observabilidade/Sentry: smoke dedicado do web e build com sourcemaps quando o runtime web foi alterado.

## 8. Lacunas conhecidas

- cobertura frontend ainda pode crescer para fluxos executivos completos.
- smoke operacional ponta a ponta owner/staff deve continuar evoluindo.
- reconnect ruim/mobile ainda nao esta coberto de ponta a ponta em todos os fluxos.

## 9. Objetivo de qualidade

A meta nao e apenas cobertura numerica. O alvo e confiabilidade em fluxos criticos de negocio em cada release.

## 10. Padrao minimo para novos testes

Ao alterar regra de negocio, buscar sempre incluir:

- 1 caso feliz (happy path)
- 1 caso de erro ou guarda
- validacao de papel/permissao quando aplicavel
- validacao de efeitos de integracao (cache, realtime, auditoria) quando o fluxo os aciona

Isso garante rastreabilidade tecnica e aumenta a confianca de quem adota o projeto em ambiente real.
