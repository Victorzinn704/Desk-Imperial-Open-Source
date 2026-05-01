# Dead Code Verification — 2026-05-01

## Objetivo

Fechar o restante do backlog de `lint:dead` sem remover legado congelado, entrypoints utilitários ou superfícies protegidas por documentação.

## Guardrails usados

1. `dashboard-wireframe` e derivados ficam fora do corte:
   - rota congelada em [route-closure-matrix-2026-04-21.md](../release/route-closure-matrix-2026-04-21.md)
   - legado temporário em [design-lab-capability-matrix.md](../product/design-lab-capability-matrix.md)
2. arquivo só entra como morto quando:
   - não aparece em import/export do repo
   - não aparece em `package.json`/scripts
   - não aparece em entrypoint de teste/runtime
3. candidato do `knip` não vira remoção automática:
   - primeiro classificar como `morto real`, `entrypoint vivo`, `falso positivo de tooling` ou `legado congelado`

## Baseline usada

- baseline `knip`: [artifacts/quality/tooling-baseline/knip.json](../../artifacts/quality/tooling-baseline/knip.json)
- snapshot externo existente: `C:\Users\Desktop\Documents\Desk-Imperial-Antigo\dead-code-snapshot-2026-04-30`

## Resultado

### Confirmados como mortos e arquivados no snapshot externo

1. `apps/api/reset-demo.ts`
2. `apps/api/prisma/seed-staff.ts`
3. `apps/web/app/desk-theme.css`

### Falsos positivos / entrypoints mantidos

1. `gulpfile.js` — entrypoint de `gulp:*` no `package.json`
2. `tests/load/k6/*.js` — entrypoints de `test:load:*` e docs de carga
3. `apps/api/prisma/backfill-product-catalog-base.ts` — script `prisma:backfill:product-catalog-base`
4. `apps/api/prisma/backfill-product-images-pexels.ts` — script `prisma:backfill:product-images:pexels`
5. `apps/api/prisma/repair-demo.ts` — script `prisma:repair-demo`
6. `apps/api/prisma/seed-runtime.ts` — importado por `seed.ts`, `repair-demo.ts` e backfills
7. `apps/api/prisma/seed.ts` — script `prisma:seed`
8. `apps/api/test/http-smoke.e2e-spec.ts` — coberto por `testRegex` do Jest E2E
9. `apps/web/public/sw.js` — registrado por `ServiceWorkerRegistrar`
10. `apps/web/public/sw-lite.js` — registrado em `app/lite/layout.tsx`
11. `apps/web/components/dashboard/employee-management-card.tsx` — usado por `EquipeEnvironment`

## Ajustes feitos para reduzir drift futuro

1. `knip.json`
   - `apps/api` agora considera `prisma/**/*.ts` como entrypoint
   - `apps/web` agora considera `public/sw*.js` como entrypoint
2. documentação de tokens foi alinhada ao estado real

## Pendência honesta

O `knip` atual não foi rerodado localmente neste host porque a execução dinâmica esbarrou em resolução incompleta de dependências de lint. O corte acima foi decidido por evidência direta de uso no repo, não por chute.
