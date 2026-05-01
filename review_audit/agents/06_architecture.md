# Architecture Audit — Desk Imperial

**Date:** 2026-04-26
**Scope:** Module boundaries, shared contracts, service layer abstraction, frontend separation, extensibility

---

## Summary

The monorepo structure (`apps/api`, `apps/web`, `packages/types`) is fundamentally sound, but the architecture exhibits localized coupling hotspots that increase the cost of change. The shared types package is partially adopted — used heavily by `operations` and `web`, but ignored by `orders`, `products`, and `finance` which redefine the same contracts locally. Cross-module imports are pervasive (38 instances), the onboarding flow has a triangular `forwardRef` cycle, and the `ComandaService` (1377 lines) acts as a god service absorbing transactional logic, realtime, kitchen, and mesh operations into a single file.

---

## Findings

### ARC-001 — Triangular circular dependency: auth ↔ consent ↔ geocoding

- **Severity:** High
- **Confidence:** High
- **Evidence:** `apps/api/src/modules/auth/auth.module.ts:2,19` imports `ConsentModule` and `GeocodingModule` via `forwardRef`. `consent/consent.module.ts:2,9` imports `AuthModule` via `forwardRef`. `geocoding/geocoding.module.ts:2,8` imports `AuthModule` via `forwardRef`. `auth-registration.service.ts:8` directly injects `GeocodingService`.
- **Impact:** The onboarding flow cannot evolve independently — any change to auth, consent, or geocoding risks ripple across the triangle. Testing requires all three modules to be wired. `GeocodingModule` is `@Global()`, making the coupling viral.
- **Recommendation:** Extract a `RegistrationOrchestrator` that coordinates auth, geocoding, and consent as a pipeline of steps; each module should only depend on abstractions (interfaces/tokens), not concrete module references.
- **Effort:** Medium (4-6 days)

**Score: 8/10**

---

### ARC-002 — ComandaService is a god service (1377 lines, 17+ public methods)

- **Severity:** High
- **Confidence:** High
- **Evidence:** `apps/api/src/modules/operations/comanda.service.ts` — 1377 lines, 17+ async methods spanning `openComanda`, `addComandaItem`, `addComandaItems`, `replaceComanda`, `assignComanda`, `updateComandaStatus`, `createComandaPayment`, `updateKitchenItemStatus`, `closeComanda`, plus private helpers for kitchen state, realtime publishing, cash settlement, finance cache invalidation. The constructor injects 8 dependencies.
- **Impact:** Any operational change (new comanda status, new payment method, kitchen workflow adjustment) forces modification in this single file. High merge conflict probability. Impossible to add features in parallel. Hard to unit-test individual use cases in isolation.
- **Recommendation:** Split into use-case services: `OpenComandaUseCase`, `CloseComandaUseCase`, `AddItemUseCase`, `KitchenTransitionUseCase`, `PaymentUseCase`. Extract side effects (realtime publish, cache invalidation) into domain events or a post-commit hook.
- **Effort:** High (7-10 days)

**Score: 9/10**

---

### ARC-003 — Shared types package is partially adopted; duplicated contracts across modules

- **Severity:** High
- **Confidence:** High
- **Evidence:** `packages/types/src/contracts.ts` defines `OrderRecord`, `ProductRecord`, `FinanceSummaryResponse`, etc. via Zod schemas. But `apps/api/src/modules/orders/orders.types.ts` defines its own `OrderRecord` (188 lines) with embedded business logic (`toOrderRecord`, `maskDocument`). `products/products.types.ts` defines its own `ProductRecord` (280 lines). `apps/web/lib/operations/operations-types.ts` defines `OperationRole`, `OperationEmployeeSummary`, etc. (75 lines) not sourced from shared contracts. Neither `@partner/types` nor `@partner/api-contract` appears as a dependency in `apps/api/package.json` or `apps/web/package.json` — the path alias `@contracts/contracts` works only through pnpm workspace hoisting.
- **Impact:** Source of truth is fragmented. A change to `OrderRecord` must be synced across 3 locations. The API module's local types include business logic (currency conversion in `toOrderRecord`), violating the contracts package's role as a pure schema layer. Undeclared dependency means tooling (Renovate, Turborepo caching) cannot correctly track the dependency graph.
- **Recommendation:** (1) Add `@partner/types` as an explicit dependency in both app `package.json` files. (2) Remove local type redefinitions in `orders.types.ts`, `products.types.ts`, `operations.types.ts` and import from `@contracts/contracts`. (3) Move mapper functions (`toOrderRecord`, `toProductRecord`) into separate mapper/transformer files, not type definition files.
- **Effort:** Medium (5-7 days)

**Score: 8/10**

---

### ARC-004 — Cross-module import leakage (38 instances across 6 modules)

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** Grep across `apps/api/src/modules/` for imports referencing other modules:
  - `orders.service.ts` imports `CurrencyService`, `GeocodingService`, `FinanceService`, `product-combo-consumption`
  - `finance.service.ts` imports `CurrencyService`, `products-catalog.util`
  - `products.service.ts` imports `CurrencyService`, `FinanceService`
  - `comanda.service.ts` imports `FinanceService`, `OperationsRealtimeService`
  - `auth-registration.service.ts` imports `GeocodingService`
  - `market-intelligence.service.ts` imports `FinanceService`
  - Module files import each other: `products.module` → `FinanceModule`, `orders.module` → `FinanceModule`, `operations.module` → `FinanceModule`
- **Impact:** Modules are not independently deployable or testable. `CurrencyService` and `FinanceService` act as quasi-cross-cutting concerns but are not designed as such (no `@Global()` on Currency, no interface abstractions). Adding a new order status would require understanding the finance cache interaction.
- **Recommendation:** Formalize `CurrencyService` as a `@Global()` module (or create a `CurrencyProvider` token). Define interface contracts for the finance cache invalidation concern (e.g., `FinanceInvalidationToken`) that modules depend on rather than the concrete `FinanceService`. Move `product-combo-consumption.util` to `common/utils/` since it's used by both `orders` and `operations`.
- **Effort:** Medium (3-5 days)

**Score: 7/10**

---

### ARC-005 — Infrastructure concerns leak into domain services

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** All major services inject infrastructure directly:
  - `ComandaService` injects `PrismaService`, `CacheService`, `AuditLogService`, `OperationsRealtimeService` alongside domain logic
  - `OperationsHelpersService` (722 lines) mixes Prisma queries, cache read/write, currency conversion, and KPI computation
  - `ConsentService` directly depends on `CacheService` for TTL caching, `AuditLogService` for audit trails
  - `AuthService` (323 lines) manages sessions, email verification, and password reset — spilling into 10+ sub-service files
- **Impact:** Domain services cannot be unit-tested without mocking infrastructure. Audit trail and cache invalidation are tangled with business rules. Separating reads from writes (CQRS-lite) is difficult because every service reads and writes directly.
- **Recommendation:** Apply a lightweight CQRS pattern: separate command handlers (write) from query resolvers (read). Use NestJS event emitter or a simple domain event bus for side effects (audit logging, cache invalidation, realtime broadcast) instead of calling them inline.
- **Effort:** High (8-12 days)

**Score: 7/10**

---

### ARC-006 — No clear aggregate root boundaries in operations domain

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** The operations module has `ComandaService`, `CashSessionService`, `OperationsHelpersService`, and `OperationsService` as a facade. `ComandaService` directly manipulates `CashSession` state (`syncComandaCashState`, `settleRemainingComandaBalance` at lines 210-230), blurs the boundary between `Comanda` and `CashSession`. `OperationsHelpersService` queries mesas, employees, sessions, and comandas in a single method for the live snapshot. No repository per aggregate — all go through `PrismaService` directly.
- **Impact:** Transactional boundaries are unclear. The `COMANDA_WRITE_ISOLATION_LEVEL` is `Serializable` (line 72), suggesting the team is compensating for missing aggregate boundaries with database locks. Refactoring comanda-related features requires understanding cash and kitchen side effects.
- **Recommendation:** Define `Comanda` and `CashSession` as distinct aggregates with clear repository interfaces. Only the aggregate root should hold a reference to another aggregate (e.g., `Comanda` references `CashSession` by ID, not by object). The live snapshot query should be a dedicated read model, not mixed with write services.
- **Effort:** High (6-10 days)

**Score: 7/10**

---

### ARC-007 — Domain logic in web lib/ (frontend) duplicates backend business rules

- **Severity:** Medium
- **Confidence:** High
- **Evidence:**
  - `apps/web/lib/operations/operations-kpis.ts` (237 lines) computes `OperationsExecutiveKpis`, `OperationsPerformerRankingEntry`, `OperationsTopProductEntry` — KPI aggregation logic that mirrors backend calculations
  - `apps/web/lib/operations/operations-realtime-patching.ts` (1088 lines) implements optimistic patching and cache invalidation logic for React Query
  - `apps/web/lib/product-packaging.ts` (137 lines) defines packaging presets, stock breakdown formulas that overlap with `products-update.utils.ts` on the API side
  - `apps/web/lib/operations/operations-types.ts` (75 lines) defines domain types not sourced from shared contracts
  - `apps/web/lib/currency.ts` has `formatCurrency`, `formatCurrencyComparison` — presentation logic, which is appropriate, but `localeByCurrency` mapping exists only here
- **Impact:** Backend rule changes (e.g., KPI formula adjustment) risk frontend drift. Optimistic patching logic duplicates backend state machine transitions. Testing must cover both backend and frontend for the same business rule.
- **Recommendation:** Move KPI computation to the API (it already exists in `operations-summary`). The shared types package should include derived helper functions (e.g., `deriveComandaPaymentState`, `computeStockBreakdown`). The frontend should consume these via `@contracts/contracts` instead of reimplementing.
- **Effort:** Medium (5-8 days)

**Score: 6/10**

---

### ARC-008 — Frontend lacks clear separation between UI, business logic, and data fetching

- **Severity:** Medium
- **Confidence:** Medium
- **Evidence:**
  - `components/dashboard/dashboard-shell.tsx` (665 lines): contains session bootstrap, role routing, realtime connection, layout variants, and navigation
  - `components/dashboard/environments/overview-environment.tsx` (1275 lines): renders the entire overview page with inline data transformation, KPI card computation, and chart configuration
  - `components/staff-mobile/staff-mobile-shell.tsx` (832 lines): duplicates operations queries and mutations with small role-based variations from `owner-mobile-shell.tsx`
  - `lib/api-*.ts` files are clean thin API fetchers — this separation is good
  - `lib/operations/operations-realtime-patching.ts` (1088 lines) contains React Query cache management logic that is deeply coupled to the operations domain
  - No `hooks/` barrel for shared data-fetching hooks; custom hooks are co-located with components (e.g., `components/dashboard/hooks/`, `components/staff-mobile/`)
- **Impact:** Components >800 lines are fragile and hard to test. Mobile shells duplicate 60-70% of logic. A new dashboard environment requires cloning an existing >1000-line component. React Query cache patching is one of the hardest parts to debug when it drifts.
- **Recommendation:** (1) Extract a `useOperationsWorkspace` hook shared between `owner-mobile-shell` and `staff-mobile-shell`. (2) Split environment components into layout shell + data hooks + presentational widgets. (3) Move `lib/operations/operations-realtime-patching.ts` into a `hooks/useOperationsRealtimePatch` that encapsulates the React Query dependency. (4) Create a `hooks/` index that re-exports all data-fetching hooks.
- **Effort:** High (7-12 days)

**Score: 6/10**

---

### ARC-009 — GeocodingModule is @Global() without clear justification

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `apps/api/src/modules/geocoding/geocoding.module.ts:6` — declared `@Global()`. Currently used only by `auth-registration.service.ts` and `orders-location.utils.ts`. It also creates a forwardRef cycle with `AuthModule`.
- **Impact:** Any new module can accidentally depend on geocoding without explicit imports, making the dependency graph opaque. `@Global()` modules should be reserved for truly infrastructure-wide concerns (e.g., ConfigModule, PrismaModule).
- **Recommendation:** Remove `@Global()` from GeocodingModule. Make modules that need it import it explicitly. This also breaks the circular dependency chain.
- **Effort:** Low (1-2 days)

**Score: 4/10**

---

### ARC-010 — operations-realtime.module.ts is top-level, not under modules/

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `apps/api/src/modules/operations-realtime.module.ts` is a single file at the modules/ level (not inside a directory like all other modules). The actual implementation is at `modules/operations-realtime/`. This split creates ambiguity about what constitutes the module boundary.
- **Impact:** Low immediate impact, but inconsistent structure adds cognitive load. New developers may not realize `operations-realtime.module.ts` and `operations-realtime/` are the same module.
- **Recommendation:** Move the module definition into `modules/operations-realtime/operations-realtime.module.ts` and delete the top-level file. Update `app.module.ts` import path.
- **Effort:** Low (0.5 days)

**Score: 3/10**

---

## Architecture Scorecard

| Dimension                            | Score (0-10) | Notes                                                                                          |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------- |
| Module boundaries                    | 5            | Circular deps, cross-module leakage, @Global() misuse                                          |
| Shared contracts adoption            | 4            | Types package partially used; orders/products/finance duplicate locally                        |
| Extensibility (new module)           | 5            | AuthSession guard, CurrencyService, FinanceService must be imported; no interface abstractions |
| Controller purity                    | 8            | Controllers are thin; one exception (auth.controller → AuditLogService)                        |
| Service layer abstraction            | 4            | God services, infrastructure mixed with domain, no repository pattern                          |
| Frontend separation (UI/logic/fetch) | 5            | API fetchers are clean; components mix UI + state + logic; large files                         |
| Aggregate root clarity               | 4            | No explicit aggregates; transactional isolation via DB locks not boundaries                    |
| Dependency hygiene                   | 5            | Undeclared package deps; forwardRef cycles; many direct cross-module imports                   |

**Overall Architecture Health: 5.0/10**

The architecture is not broken — it works in production — but it carries significant technical debt in coupling and contract fragmentation. The same 5-7 files absorb almost every change, and the shared types package is underutilized despite being the intended source of truth. Without intervention, blast radius will continue to grow linearly with feature count.

---

## Positive Findings

1. **Monorepo layout is correct:** `apps/` + `packages/` structure with pnpm workspaces supports growth.
2. **Controllers are thin:** The API layer follows NestJS conventions — controllers delegate to services cleanly.
3. **API fetchers are clean:** `lib/api-*.ts` files are pure HTTP clients with no business logic.
4. **TypeScript strict mode** is enabled in `apps/web/tsconfig.json` (`"strict": true`).
5. **The shared validation patterns** (`packages/types/src/validation-patterns.ts`) provide CPF/CNPJ validation used by both sides — this is the right pattern to extend.
6. **OperationsService as facade** is the right abstraction — it just needs its children to be better decomposed.

---

## Recommended Attack Order

1. **ARC-001 + ARC-009** — Resolve circular deps and remove `@Global()` (low effort, removes viral coupling)
2. **ARC-003** — Standardize shared types adoption (medium effort, prevents future drift)
3. **ARC-002** — Split ComandaService (high effort, highest value for ongoing development)
4. **ARC-004** — Formalize cross-cutting concerns (medium effort)
5. **ARC-008** — Extract shared frontend hooks (high effort, eliminates duplication)
6. **ARC-005 + ARC-006** — Define aggregates and separate infra from domain (high effort, long-term)
7. **ARC-007** — Move KPI computation to backend (medium effort)
8. **ARC-010** — Fix module file location (trivial)
