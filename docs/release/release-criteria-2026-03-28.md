# Release Criteria - 2026-03-28

## Obrigatório

### Código

- `npx tsc --noEmit -p apps/api/tsconfig.json`
- `npx tsc --noEmit -p apps/web/tsconfig.json`

### Backend

- `npm --workspace @partner/api test -- --runInBand`
- `npm --workspace @partner/api run test:e2e`

### Frontend

- `npm --workspace @partner/web test -- lib/operations/operations-kpis.test.ts components/staff-mobile/staff-mobile-shell.test.tsx components/pdv/pdv-historico-view.test.tsx components/owner-mobile/owner-mobile-shell.test.tsx`
- `npm --workspace @partner/web run test:e2e`

### Operação manual mínima

- login owner
- login staff
- abrir comanda
- adicionar item de cozinha
- validar reflexo na cozinha
- fechar comanda
- validar KPI no owner

## Desejável

- rodar scripts k6 em staging
- validar Redis/Postgres reais em smoke de staging
- validar logout e sessão ponta a ponta no web

## Fora do escopo desta baseline

- multi-browser E2E formal
- soak test prolongado
- benchmark de throughput de realtime multi-instância
