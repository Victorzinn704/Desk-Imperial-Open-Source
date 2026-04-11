# Refatoracao — Candidatos a Refatoracao Maior

> Data: 2026-04-10
> Metodo: analise ESLint (complexity, max-lines, max-lines-per-function, max-params, no-nested-ternary, no-non-null-assertion)

---

## Prioridade 1: Critico (> 600 linhas + complexidade > 20)

### 1. `operations-helpers.service.ts` — 1329 linhas
**Path:** `apps/api/src/modules/operations/operations-helpers.service.ts`
**Warnings:** 15

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `buildLiveSnapshot` | 164 | 21 |
| `ensureOrderForClosedComanda` | 146 | - |
| `buildSummaryView` | 131 | - |
| `buildKitchenView` | 96 | - |
| `syncCashClosure` | 85 | - |
| `recalculateCashSession` | 70 | - |
| `resolveComandaDraftItems` | 55 | - |

**Problemas adicionais:** 3x ternarios aninhados, 3x non-null assertions
**Acao sugerida:** Extrair cada `build*View` em servico separado (`live-snapshot.service.ts`, `kitchen-view.service.ts`, `summary-view.service.ts`). Mover `recalculateCashSession` e `syncCashClosure` para `cash-session.service.ts` (ja existe la).

### 2. `comanda.service.ts` — 1157 linhas
**Path:** `apps/api/src/modules/operations/comanda.service.ts`
**Warnings:** 17

| Funcao | Linhas |
|--------|--------|
| `openComanda` | 164 |
| `addComandaItems` | 128 |
| `replaceComanda` | 124 |
| `addComandaItem` | 104 |
| `closeComanda` | 100 |
| `assignComanda` | 86 |
| `updateComandaStatus` | 74 |
| `updateKitchenItemStatus` | 74 |

**Problemas adicionais:** 6 dependencies no constructor, 4x non-null assertions
**Acao sugerida:** Dividir em `comanda-lifecycle.service.ts` (open/close), `comanda-items.service.ts` (add/replace items), `comanda-kitchen.service.ts` (kitchen status), `comanda-assignment.service.ts` (assign). Manter facade `comanda.service.ts` como orquestrador.

### 3. `orders.service.ts` — 702 linhas
**Path:** `apps/api/src/modules/orders/orders.service.ts`
**Warnings:** 11

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `createForUser` | 235 | 18 (arrow fn interna) |
| `cancelForUser` | 133 | - |
| `listForUser` | 81 | - |
| arrow fn (cancel) | 96 | - |

**Problemas adicionais:** 7 params no constructor, 3x non-null assertions
**Acao sugerida:** Extrair `order-creation.service.ts` e `order-cancellation.service.ts`. Reduzir constructor com pattern de Provider/Factory ou agrupar deps em `OrderDependencies` interface.

### 4. `products.service.ts` — 704 linhas
**Path:** `apps/api/src/modules/products/products.service.ts`
**Warnings:** 16

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `createForUser` (com transacao) | 106 | - |
| `validateImportRow` | - | 20 |
| `updateForUser` | 67 | - |
| `buildComboItemsPayload` | 59 | - |
| `listForUser` | 52 | 16 |

**Problemas adicionais:** 8x non-null assertions
**Acao sugerida:** Extrair `product-import.service.ts` (CSV import logic), `combo-management.service.ts`. O core CRUD pode ficar no `products.service.ts` principal.

---

## Prioridade 2: Alto (300-600 linhas + complexidade)

### 5. `finance.service.ts` — 486 linhas (+ `finance-analytics.util.ts` — 511 linhas)
**Path:** `apps/api/src/modules/finance/`
**Warnings:** 8

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `buildAndCacheSummary` | 258 | 22 |
| `buildTopCustomers` | 56 | - |
| `buildTopEmployees` | 65 | - |
| `buildSalesMap` | 70 | - |
| `buildTopRegions` | 61 | - |
| `buildRevenueTimeline` | 57 | - |

**Acao sugerida:** `buildAndCacheSummary` domina o arquivo. Extrair cada `build*` do util em servicos de analytics separados (`revenue-analytics.service.ts`, `top-performers.service.ts`, `geographic-analytics.service.ts`).

### 6. `auth-login.service.ts` — 563 linhas
**Path:** `apps/api/src/modules/auth/auth-login.service.ts`
**Warnings:** 8

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `login` | 107 | 17 |
| `loginDemo` | 84 | - |
| `resolveLoginActor` | 64 | 19 |

**Problemas adicionais:** 8 params no constructor
**Acao sugerida:** Ja foi dividido do auth.service original. Pode melhorar reduzindo constructor params com interface de deps. `resolveLoginActor` pode ser simplificado com pattern matching mais limpo.

### 7. `cash-session.service.ts` — 442 linhas
**Path:** `apps/api/src/modules/operations/cash-session.service.ts`
**Warnings:** 5

| Funcao | Linhas |
|--------|--------|
| `openCashSession` | 79 |
| `closeCashSession` | 77 |
| `createCashMovement` | 69 |
| `closeCashClosure` | 70 |

**Acao sugerida:** Tamanho razoavel. Podria extrair validacao de abertura/fechamento em helpers separados. Prioridade media.

### 8. `use-operations-realtime.ts` — 1017 linhas (FRONTEND)
**Path:** `apps/web/components/operations/use-operations-realtime.ts`
**Warnings:** 7

| Funcao | Linhas | Complexidade |
|--------|--------|-------------|
| `buildComandaFromPayload` | 71 | **90** |
| `buildKitchenItemFromPayload` | - | 30 |
| `useOperationsRealtime` | 61 | - |
| `patchCashSession` | 57 | - |

**Problemas adicionais:** Ternarios aninhados
**Acao sugerida:** `buildComandaFromPayload` com complexidade 90 e o pior ofensor do projeto todo. Extrair mapeamento de payload em funcoes pequenas por tipo de campo. Criar `comanda-payload.mapper.ts` separado do hook.

---

## Prioridade 3: Medio (frontend complexo)

### 9. `salao-environment.tsx` — 712 linhas (FRONTEND)
**Path:** `apps/web/components/dashboard/salao-environment.tsx`
**Warnings:** 10
- `SalaoEnvironment`: 323 linhas, complexidade 20
- `OperacionalView`: 185 linhas
- `ComandasTableView`: 138 linhas
- 4x ternarios aninhados

**Acao sugerida:** Extrair `OperacionalView` e `ComandasTableView` em arquivos proprios.

### 10. `pdv-salao-unified.tsx` — 702 linhas (FRONTEND)
**Path:** `apps/web/components/pdv/pdv-salao-unified.tsx`
**Warnings:** 6
- `EquipeView`: 224 linhas
- `SalaoView`: 219 linhas
- `SalaoUnificado`: 184 linhas

**Acao sugerida:** Cada view em arquivo separado.

### 11. `dashboard-shell.tsx` — 692 linhas (FRONTEND)
**Path:** `apps/web/components/dashboard/dashboard-shell.tsx`
**Warnings:** 6
- `DashboardShell`: 182 linhas, complexidade **36**
- `DashboardWorkspaceHeader`: 122 linhas

**Acao sugerida:** Extrair header e loading state em componentes separados.

### 12. `pdv-comanda-modal.tsx` — 617 linhas (FRONTEND)
**Path:** `apps/web/components/pdv/pdv-comanda-modal.tsx`
**Warnings:** 5
- `PdvComandaModal`: 367 linhas, complexidade **37**

**Acao sugerida:** Extrair secoes do modal em sub-componentes.

---

## Ranking Consolidado por Severidade

| # | Arquivo | Linhas | Pior Complexidade | Warnings | Prioridade |
|---|---------|--------|-------------------|----------|------------|
| 1 | `operations-helpers.service.ts` | 1329 | 21 | 15 | CRITICA |
| 2 | `comanda.service.ts` | 1157 | - | 17 | CRITICA |
| 3 | `use-operations-realtime.ts` (web) | 1017 | **90** | 7 | CRITICA |
| 4 | `orders.service.ts` | 702 | 18 | 11 | CRITICA |
| 5 | `products.service.ts` | 704 | 20 | 16 | CRITICA |
| 6 | `salao-environment.tsx` (web) | 712 | 20 | 10 | ALTA |
| 7 | `pdv-salao-unified.tsx` (web) | 702 | - | 6 | ALTA |
| 8 | `dashboard-shell.tsx` (web) | 692 | **36** | 6 | ALTA |
| 9 | `pdv-comanda-modal.tsx` (web) | 617 | **37** | 5 | ALTA |
| 10 | `auth-login.service.ts` | 563 | 19 | 8 | MEDIA |
| 11 | `finance.service.ts` + util | 486+511 | 22 | 8 | MEDIA |
| 12 | `cash-session.service.ts` | 442 | - | 5 | MEDIA |

---

## Proxima Fase Sugerida (Fase 3)

1. **`operations-helpers.service.ts`** — extrair 4 servicos especializados das views
2. **`comanda.service.ts`** — dividir em 4 servicos por dominio (lifecycle, items, kitchen, assignment)
3. **`use-operations-realtime.ts`** — reduzir complexidade 90 do `buildComandaFromPayload` (worst do projeto)
4. **`orders.service.ts`** — extrair criacao e cancelamento
5. **`products.service.ts`** — extrair import CSV e combos
