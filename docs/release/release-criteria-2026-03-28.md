# Release Criteria - 2026-03-28

## Fonte de verdade

O gate oficial de release e o workflow [`ci.yml`](../../.github/workflows/ci.yml). Este documento traduz o gate real em checklist operacional legivel.

Uma release so pode ser promovida quando:

1. o workflow `CI` estiver verde no mesmo SHA;
2. os checks automáticos abaixo tiverem passado;
3. a validacao manual minima estiver registrada.

## Obrigatório - Gate automático

### Qualidade

- `npm run lint`
- `npm run typecheck`

### Backend

- `npm --workspace @partner/api run test -- --ci --coverage --forceExit`
- `npm --workspace @partner/api run test:e2e`

### Frontend

- `npm --workspace @partner/web run test`
- `npm --workspace @partner/web run test:e2e`

### Segurança

- `npm run repo:scan-public`
- `npm audit --audit-level=high`
- `npm run security:audit-runtime`

### Performance / readiness operacional

- preparar `Postgres` e `Redis` do gate
- `npm --workspace @partner/api run build`
- `npm run test:load:ci`

### Build

- `npm run build`

## Obrigatório - Validação manual mínima

- login owner
- login staff
- abrir comanda
- adicionar item de cozinha
- validar reflexo na cozinha
- fechar comanda
- validar KPI no owner
- validar logout e retorno de sessão

## Obrigatório - Evidência de release

Registrar no lote de release:

1. SHA validado
2. link do workflow verde
3. resultado da validacao manual minima
4. decisão de go/no-go
5. responsável pela promoção

## Desejável

- `npm run quality:preflight:full`
- scripts `k6` adicionais em staging
- smoke com Redis/Postgres reais no staging alvo
- revisão dos dashboards `Desk Imperial - OSS Observability Overview` e `Desk Imperial - Business Observability`

## Fora do escopo desta baseline

- multi-browser E2E formal
- soak test prolongado
- benchmark de throughput de realtime multi-instância
