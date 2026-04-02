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
- DTO validado
- logs estruturados
- exceptions padronizadas
- auditoria para eventos sensiveis
