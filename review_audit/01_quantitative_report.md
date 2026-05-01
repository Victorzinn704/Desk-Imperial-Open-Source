# Relatório Quantitativo — Desk Imperial (2026-04-26)

## 1. Linhas de Código (cloc)

| Linguagem     | Arquivos  | Linhas de código | Branco     | Comentário |
| ------------- | --------- | ---------------- | ---------- | ---------- |
| TypeScript    | 699       | 105,398          | 12,131     | 1,603      |
| JSON          | 31        | 44,638           | 1          | 0          |
| Markdown      | 183       | 22,314           | 8,730      | 22         |
| Text          | 3         | 5,034            | 895        | 0          |
| YAML          | 38        | 4,806            | 240        | 5          |
| CSS           | 4         | 3,628            | 553        | 86         |
| JavaScript    | 32        | 3,351            | 574        | 130        |
| PowerShell    | 9         | 929              | 168        | 0          |
| Bourne Shell  | 18        | 905              | 164        | 4          |
| SQL           | 31        | 754              | 207        | 162        |
| Prisma Schema | 1         | 591              | 59         | 0          |
| Python        | 3         | 458              | 92         | 9          |
| Dockerfile    | 6         | 180              | 60         | 0          |
| Outros        | 9         | 125              | 21         | 19         |
| **TOTAL**     | **1,067** | **193,111**      | **23,895** | **2,040**  |

**Destrinche por app/package (TS source, sem node_modules/dist/.turbo/.next/coverage):**

- `apps/web/`: ~51.7k lines (componentes, hooks, lib)
- `apps/api/`: ~49.2k lines (modules, services, controllers)
- `packages/types/`: ~571 lines (contratos compartilhados)
- `apps/api/test/`: ~11.2k lines (testes backend)
- `apps/web/test/`: ~3.5k lines (testes frontend)

## 2. Top 30 Arquivos Maiores (TS/TSX source, sem build/deps)

| #   | Linhas | Arquivo                                                                    |
| --- | ------ | -------------------------------------------------------------------------- |
| 1   | 1,520  | `apps/web/components/dashboard/environments/pedidos-environment.tsx`       |
| 2   | 1,411  | `apps/api/test/products.service.spec.ts`                                   |
| 3   | 1,377  | `apps/api/src/modules/operations/comanda.service.ts`                       |
| 4   | 1,342  | `apps/web/components/calendar/commercial-calendar.tsx`                     |
| 5   | 1,275  | `apps/web/components/dashboard/environments/overview-environment.tsx`      |
| 6   | 1,243  | `apps/web/components/dashboard/environments/portfolio-environment.tsx`     |
| 7   | 1,088  | `apps/web/lib/operations/operations-realtime-patching.ts`                  |
| 8   | 1,088  | `apps/web/components/dashboard/salao-environment.tsx`                      |
| 9   | 934    | `apps/api/test/finance.service.spec.ts`                                    |
| 10  | 932    | `apps/web/components/dashboard/environments/equipe-environment.tsx`        |
| 11  | 904    | `apps/api/test/auth.service.session-and-recovery.spec.ts`                  |
| 12  | 846    | `apps/api/test/operations-helpers.branches.spec.ts`                        |
| 13  | 834    | `apps/api/test/orders.service.spec.ts`                                     |
| 14  | 832    | `apps/web/components/staff-mobile/staff-mobile-shell.test.tsx`             |
| 15  | 799    | `apps/web/components/dashboard/environments/financeiro-tab-panels.tsx`     |
| 16  | 778    | `apps/api/test/auth.service.spec.ts`                                       |
| 17  | 755    | `apps/web/components/pdv/pdv-salao-unified.tsx`                            |
| 18  | 748    | `apps/web/components/dashboard/product-form.tsx`                           |
| 19  | 744    | `apps/web/components/dashboard/environments/pdv-wireframe-environment.tsx` |
| 20  | 722    | `apps/api/src/modules/operations/operations-helpers.service.ts`            |
| 21  | 707    | `apps/web/components/operations/operations-executive-grid.tsx`             |
| 22  | 703    | `apps/web/components/owner-mobile/owner-mobile-shell.test.tsx`             |
| 23  | 702    | `apps/web/components/pdv/pdv-comanda-modal.tsx`                            |
| 24  | 693    | `apps/web/components/staff-mobile/mobile-comanda-list.tsx`                 |
| 25  | 672    | `apps/web/components/staff-mobile/mobile-order-builder.tsx`                |
| 26  | 665    | `apps/web/components/dashboard/dashboard-shell.tsx`                        |
| 27  | 633    | `apps/api/src/modules/orders/orders.service.ts`                            |
| 28  | 631    | `apps/web/components/staff-mobile/use-staff-mobile-shell-controller.ts`    |
| 29  | 601    | `apps/api/src/modules/finance/finance.service.ts`                          |
| 30  | 579    | `apps/api/src/modules/products/products.service.ts`                        |

**Arquivos > 1,000 linhas:** 8 (source + test)
**Arquivos > 500 linhas:** 50
**Arquivos > 300 linhas:** ~85 (estimado dos top 30 por extrapolação)

## 3. Dependências

| App/Package                        | deps | devDeps | Total |
| ---------------------------------- | ---- | ------- | ----- |
| Root (`package.json`)              | 3    | 14      | 17    |
| `@partner/api`                     | 38   | 19      | 57    |
| `@partner/web`                     | 28   | 21      | 49    |
| `@partner/types` (packages/types/) | —    | —       | —     |

**Total de dependências na árvore npm:** 1,656 (512 prod, 1127 dev, 98 optional)

**Pacotes mais pesados (install size estimado):**

- `@opentelemetry/*` (7 pacotes)
- `prisma` + `@prisma/client`
- `next` + `react` + `react-dom`
- `socket.io` + `socket.io-client`
- `ag-grid-community` + `ag-grid-react`
- `recharts` (charts)

## 4. ESLint (npm run lint)

| App            | Erros | Warnings | Warnings fixable |
| -------------- | ----- | -------- | ---------------- |
| `@partner/api` | 0     | 190      | 18               |
| `@partner/web` | 0     | 661      | 142              |
| **TOTAL**      | **0** | **851**  | **160**          |

**Top 5 regras de warning:**

1. `max-lines-per-function` (320) — arquivos com funções >50 linhas
2. `no-nested-ternary` (124) — ternários aninhados
3. `react/jsx-sort-props` (106) — props não ordenadas
4. `complexity` (95) — funções com complexidade >15
5. `@typescript-eslint/no-non-null-assertion` (77) — uso de `!`

**Arquivos com mais warnings:**

1. `pedidos-environment.tsx` — 25
2. `salao-environment.tsx` — 23
3. `commercial-calendar.tsx` — 20
4. `barcode/lookup/route.ts` — 19
5. `overview-environment.tsx` — 18

## 5. TypeScript — npm run typecheck

**Resultado:** PASS (2/2 successful)

- `@partner/api`: OK, sem erros
- `@partner/web`: OK, sem erros

**`any` explícito no código:** 54 ocorrências (sem `@ts-ignore`, apenas 2 `@ts-expect-error`)
**Zero `@ts-ignore`** — disciplina alta de tipagem.

## 6. npm audit

| Severidade | Contagem |
| ---------- | -------- |
| Critical   | 0        |
| High       | 0        |
| Moderate   | 0        |
| Low        | 0        |
| **TOTAL**  | **0**    |

Árvore de dependências limpa. Zero vulnerabilidades conhecidas.

## 7. npm outdated

Pacotes totais desatualizados: ~48 (estimado do JSON output)

**Top 10 com maior gap (major semántico):**
| Pacote | Atual | Mais recente | Gap |
|---|---|---|---|
| `@prisma/client` | 6.19.3 | 7.8.0 | **major** |
| `prisma` | 6.19.3 | 7.8.0 | **major** |
| `@eslint/js` | 9.39.4 | 10.0.1 | **major** |
| `@nestjs/swagger` | 11.2.7 | 11.4.1 | minor |
| `@playwright/test` | 1.58.2 | 1.59.1 | minor |
| `@tanstack/react-query` | 5.90.21 | 5.100.5 | minor |
| `@opentelemetry/auto-instrumentations-node` | 0.72.0 | 0.73.0 | minor |
| `@types/node` | 24.12.0 | 25.6.0 | **major** |
| `eslint` | 9.36.0 | 9.41.0 | minor |

## 8. TODO / FIXME / HACK / XXX

**Contagem:** 0 (zero) ocorrências no código fonte.

Projeto limpo de marcadores de débito técnico explícito.

## 9. console.log / console.debug em código de produção

**Contagem total (source):** 57 ocorrências

Detalhe: 41 estão em scripts de seed/backfill/repair (prisma/), não em produção.
Em produção efetiva: ~16 occurrences restantes (console.warn, console.error, etc.)

## 10. 'use client' — Next.js

**Arquivos com `'use client'` no web (TSX):** 164
**Total de arquivos TSX no web:** 288
**Razão client/server:** 57% client components

## 11. React Hooks (useEffect/useState/useMemo/useCallback)

**Total de ocorrências no source:** 586

Componentes com maior densidade de hooks (estimado dos top 30 larger files): ambientes do dashboard (pedidos, overview, portfolio, salao), shells mobile, operations-realtime-patching.

## 12. Cobertura de Testes

| App            | Cobertura de linha                | Fonte                      |
| -------------- | --------------------------------- | -------------------------- |
| `@partner/web` | 69.11%                            | `quality:warnings` / Sonar |
| `@partner/api` | — (não disponível nesta execução) |                            |
| Backend smoke  | — (falha Redis)                   |                            |

**Suites críticas:** 65 testes (API) + web testes rodando e passando.
**Full suite:** falha no backend por dependência de Redis no smoke operacional.

## 13. Build

**Resultado:** PASS (2/2)

- `@partner/api`: build OK, Nest.js compilado com tsc
- `@partner/web`: build OK, Next.js com SSG/SSR/CSR

## 14. Git Hotspots (arquivos mais modificados)

| #   | Commits | Arquivo                                                   |
| --- | ------- | --------------------------------------------------------- |
| 1   | 77      | `apps/web/components/marketing/landing-page.tsx`          |
| 2   | 69      | `apps/web/app/globals.css`                                |
| 3   | 66      | `apps/web/components/dashboard/dashboard-shell.tsx`       |
| 4   | 39      | `apps/api/src/modules/auth/auth.service.ts`               |
| 5   | 36      | `apps/web/components/staff-mobile/staff-mobile-shell.tsx` |
| 6   | 35      | `apps/web/lib/api.ts`                                     |
| 7   | 34      | `apps/web/components/owner-mobile/owner-mobile-shell.tsx` |
| 8   | 33      | `apps/web/components/auth/login-form.tsx`                 |
| 9   | 32      | `apps/web/components/dashboard/dashboard-sidebar.tsx`     |
| 10  | 32      | `apps/api/src/modules/operations/comanda.service.ts`      |

## 15. Prisma Schema

**Modelos:** 22
**Migrations:** presente em `apps/api/prisma/migrations/`

## 16. Resumo de Métricas Chave

| Métrica                    | Valor   |
| -------------------------- | ------- |
| LOC TypeScript             | 105,398 |
| LOC total                  | 193,111 |
| Arquivos > 500 linhas      | 50      |
| Arquivos > 1000 linhas     | 8       |
| Erros ESLint               | 0       |
| Warnings ESLint            | 851     |
| Erros TypeScript           | 0       |
| Vulnerabilidades npm       | 0       |
| Pacotes desatualizados     | ~48     |
| TODO/FIXME/HACK            | 0       |
| `any` no código            | 54      |
| `@ts-ignore`               | 0       |
| `'use client'` (razão web) | 57%     |
| Cobertura web              | 69.11%  |
| Typecheck                  | PASS    |
| Build                      | PASS    |
| Testes críticos            | PASS    |
| Audit                      | CLEAN   |
