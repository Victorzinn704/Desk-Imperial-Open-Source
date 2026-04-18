# apps/api

API backend em NestJS.

## Objetivo

Concentrar:

- autenticacao e sessao
- produtos
- financeiro
- consentimento LGPD
- observabilidade e audit logs

## Estrutura interna

- `src/common`: blocos reutilizaveis de infraestrutura
- `src/database`: Prisma, seeds e acesso ao banco
- `src/observability`: logs estruturados, tracing, health checks e monitoramento
- `src/modules/auth`: login, logout, sessoes e cookies
- `src/modules/employees`: equipe, cargos e indicadores internos
- `src/modules/products`: CRUD de produtos
- `src/modules/finance`: calculos, indicadores e relatorios
- `src/modules/consent`: termos, cookies e consentimentos
- `src/modules/monitoring`: health, audit logs e integracoes de monitoramento
- `test`: testes integrados e contratos

## Boas praticas

- controller fino
- service com regra de negocio
- validacao de borda via DTO legado ou schema Zod, conforme a wave do modulo
- logs estruturados
- exceptions padronizadas
- auditoria para eventos sensiveis

## Superficie HTTP atual

- prefixo publico: `/api/v1`
- especificacao: `GET /api/v1/openapi.json`
- docs interativos: `GET /api/v1/docs`

## Contratos compartilhados

- `packages/types`: contratos Zod compartilhados entre API e Web
- `packages/api-contract`: `openapi.json` gerado pela API

## Testes com Redis real

- O smoke `test/be-01-operational-smoke.spec.ts` respeita `REDIS_URL`, `REDIS_PRIVATE_URL` e `REDIS_PUBLIC_URL`.
- Setup executável e comandos exatos: [docs/operational-runbook.md](../../docs/operational-runbook.md#running-tests-locally)
