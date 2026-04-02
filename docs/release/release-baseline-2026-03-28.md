# Release Baseline - 2026-03-28

## Escopo

Baseline executiva preparada para release técnica do Desk Imperial com foco em:

- backend API
- frontend web
- auth
- operação ao vivo
- smoke E2E
- testes de carga versionados

## Evidências executadas nesta baseline

### Backend

```bash
npx tsc --noEmit -p apps/api/tsconfig.json
npm --workspace @partner/api test -- --runInBand
npm --workspace @partner/api run test:e2e
```

Resultado validado:

- `16` suítes backend passando
- `396` testes backend passando
- `1` suíte E2E backend passando
- `4` testes E2E backend passando

### Frontend

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
npm --workspace @partner/web test -- lib/operations/operations-kpis.test.ts components/staff-mobile/staff-mobile-shell.test.tsx components/pdv/pdv-historico-view.test.tsx components/owner-mobile/owner-mobile-shell.test.tsx
npm --workspace @partner/web run test:e2e
```

Resultado validado:

- typecheck web passando
- `4` arquivos Vitest focados passando
- `12` testes frontend focados passando
- `19` testes Playwright em Chromium passando

## Suites incluídas

### Backend unit / integration mockada

- `auth.service.spec.ts`
- `employees.service.spec.ts`
- `finance.service.spec.ts`
- `finance-analytics.util.spec.ts`
- `orders.service.spec.ts`
- `operations-service.spec.ts`
- `products.service.spec.ts`
- `cache.service.spec.ts`
- `app.service.spec.ts`
- demais suítes documentadas em `docs/testing/testing-guide.md`

### Backend smoke E2E

- `http-smoke.e2e-spec.ts`

Cobertura principal:

- `GET /api/health`
- `POST /api/auth/login`

### Frontend Vitest

- `operations-kpis.test.ts`
- `staff-mobile-shell.test.tsx`
- `owner-mobile-shell.test.tsx`
- `pdv-historico-view.test.tsx`

### Frontend Playwright Chromium

- `apps/web/e2e/auth.spec.ts`
- `apps/web/e2e/navigation.spec.ts`
- `apps/web/e2e/ui-ux.spec.ts`

## Observações de governança

- O gate E2E web foi reduzido para `Chromium` por decisão intencional de confiabilidade.
- O banner de cookies foi neutralizado por fixture de consentimento para evitar falso negativo.
- Testes de carga foram versionados como artefatos de automação, mas não executados nesta baseline.
- Testes reais de Redis/Postgres em ambiente vivo ainda dependem de stack dedicado.

## Status

- `Automação crítica`: pronta
- `Baseline documental`: pronta
- `Release gate técnico`: pronto para uso com risco residual documentado
