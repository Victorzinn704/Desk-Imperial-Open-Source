# Testing Guide

## 1. Escopo

Este guia descreve a estrategia de testes atual do Desk Imperial para backend, frontend e gate de CI.

## 1.1 Testes como documentacao

Neste projeto, testes tambem funcionam como documentacao de comportamento.
Isso e especialmente importante para codigo aberto sob licenca MIT, porque ajuda usuarios e contribuidores a entender:

- contratos de regra de negocio
- fronteiras de autorizacao
- cenarios de erro esperados
- efeitos colaterais (cache, auditoria, realtime)

Guia pratico da API: `apps/api/test/README.md`.

## 2. Stack de testes

### Backend

- Jest
- @nestjs/testing
- suites unitarias e de servico
- suite e2e de smoke HTTP

### Frontend

- Vitest (unit/component/hook)
- Playwright (E2E baseline em Chromium)

## 3. Comandos principais

### Monorepo

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Backend

```bash
npm --workspace @partner/api run test
npm --workspace @partner/api run test:e2e
```

### Frontend

```bash
npm --workspace @partner/web run test
npm --workspace @partner/web run test:e2e
npm run test:e2e:critical
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
- Frontend E2E critico: guardas contra falhas silenciosas (pageerror, console.error e unhandledrejection).
- Load critico: metas de latencia p95/p99 para health e login.
- Gate de performance no CI: k6 de curta duracao para bloquear regressao de latencia.

## 5. CI (gate obrigatorio)

O workflow principal em `.github/workflows/ci.yml` executa:

1. quality (lint + typecheck)
2. backend-tests
3. frontend-unit
4. frontend-e2e (Chromium)
5. security checks
6. build (dependente dos gates anteriores)

## 6. Regras para PR

Antes de abrir PR:

- executar testes da area alterada
- validar typecheck
- garantir que mudancas de contrato API tenham teste associado
- anexar contexto de regressao quando o fluxo for sensivel

## 7. Testes recomendados por mudanca

- Auth/seguranca: suites de auth + guardas + smoke de login.
- Operacao/realtime: testes de services operacionais + hooks de sincronizacao.
- Finance/comercial: agregacoes e mutacoes com impacto em KPI.
- UI critica: unit + e2e baseline no fluxo afetado.

## 8. Lacunas conhecidas

- cobertura frontend ainda pode crescer para fluxos executivos completos.
- smoke operacional ponta a ponta owner/staff deve continuar evoluindo.

## 9. Objetivo de qualidade

A meta nao e apenas cobertura numerica, e confiabilidade em fluxos criticos de negocio em cada release.

## 10. Padrao minimo para novos testes

Ao alterar regra de negocio, buscar sempre incluir:

- 1 caso feliz (happy path)
- 1 caso de erro/guarda
- validacao de papel/permissao quando aplicavel
- validacao de efeitos de integracao (cache/realtime/auditoria) quando o fluxo os aciona

Isso garante rastreabilidade tecnica e aumenta a confianca de quem adota o projeto em ambiente real.
