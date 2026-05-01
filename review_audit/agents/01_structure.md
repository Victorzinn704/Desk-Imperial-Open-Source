# 01 — Code Structure Audit Report

**Project:** Desk Imperial  
**Scope:** `apps/api/src/modules/`, `apps/web/components/`, `apps/web/lib/`, `apps/web/hooks/`, `packages/types/`  
**Date:** 2026-04-26  
**Auditor:** Structure Specialist Agent (read-only)

---

## Summary

The codebase has a well-organized NestJS backend with clean module boundaries and a Next.js frontend with good barrel hygiene. However, it carries significant structural debt: a 1377-line monolith service (`comanda.service.ts`), 3 circular dependency chains, a near-identical duplicative logic across API and web, a deprecated no-op file still in the tree, a layer-violating lib→component import, and zero backend unit tests across 131 module files. The web side has strong test coverage but carries legacy "wireframe"/"legacy" environment duplicates that inflate the component surface.

---

## Quantitative Evidence

| Metric | Value |
|---|---|
| Total API module source files | 131 (.ts) |
| Total API module lines | 19,781 |
| API module test files | 0 |
| Total web component files | 324 (.ts/.tsx) |
| Total web component lines | 60,129 |
| Web component test files | 73 |
| Total web lib files | 74 (.ts) |
| Web lib lines | 11,526 |
| Web lib test files | 29 |
| Web hooks directory files | 3 |
| Shared types package files | 3 (571-line contracts.ts, 159-line validation-patterns.ts, 2-line index.ts) |
| Barrel/index.ts files (web components) | 7 |
| Barrel/index.ts files (web lib) | 2 |
| Circular dependency chains (forwardRef) | 3 instances across 3 modules |
| Largest single file (API) | `comanda.service.ts` — 1,377 lines, 25 imports |
| Largest single file (web component) | `commercial-calendar.tsx` — 1,342 lines |
| Largest single file (web lib) | `operations-realtime-patching.ts` — 1,088 lines |
| Deepest directory nesting | 6 levels (e.g., `components/pdv/salao/hooks/`, `components/dashboard/settings/tabs/`) |
| Files with 0 non-test imports (web lib) | `pin-rate-limiter.ts` (deprecated, no-op) |

---

## Findings

### F01 — God Service: `comanda.service.ts` (1377 lines)

- **ID:** F01
- **Title:** Monolithic ComandaService is 3-5x typical module service size
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/api/src/modules/operations/comanda.service.ts:1-1377` — 1,377 lines (next largest: `orders.service.ts` at 633 lines, `finance.service.ts` at 601 lines)  
  - Imports from 8 distinct module/domain areas: NestJS common (line 1), Prisma client (line 10), 5 `../../common/` utilities (lines 18-30), 3 sibling operations files (lines 28-29), 1 cross-module (`../finance/finance.service.ts`, line 31), 5 intra-module util files (lines 32-57), plus 9 DTO type imports (lines 59-69)  
  - 25 total import statements
- **Symptom/Bottleneck/Root Cause:** The service handles comanda CRUD, kitchen status propagation, cash session interaction, realtime publishing, mesa management, payment processing, low-stock checks — responsibilities that should be spread across 4-5 focused services.
- **Impact:** Any change to comanda logic risks side effects. Very difficult to unit test (no test file exists). Blocks team velocity on the highest-traffic domain.
- **Recommendation:** Extract into: `comanda-crud.service.ts`, `comanda-kitchen.service.ts`, `comanda-payment.service.ts`, `comanda-realtime.service.ts`. Delegate cross-cutting concerns (cash, finance) via injected services.
- **Effort Estimate:** L (3-5 days, high risk — requires careful extraction + test coverage)

---

### F02 — Circular Dependencies (3 forwardRef chains)

- **ID:** F02
- **Title:** Auth ↔ Consent ↔ Geocoding form a bidirectional dependency graph
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/api/src/modules/auth/auth.module.ts:19` — `forwardRef(() => ConsentModule), forwardRef(() => GeocodingModule)`  
  - `apps/api/src/modules/consent/consent.module.ts:9` — `forwardRef(() => AuthModule)`  
  - `apps/api/src/modules/geocoding/geocoding.module.ts:8` — `forwardRef(() => AuthModule)`  
- **Symptom/Bottleneck/Root Cause:** AuthModule depends on Consent and Geocoding (likely for registration workflows), while Consent and Geocoding depend on Auth (for guards/authentication). This creates a module-level circular dependency that NestJS paper-over with `forwardRef` but does not resolve the underlying tight coupling.
- **Impact:** Module initialization order becomes fragile. Testing modules in isolation is impossible without full context. Refactoring any of the 3 modules risks breaking the initialization chain.
- **Recommendation:** Extract shared auth concerns (guards, decorators) into a separate `auth-core.module.ts` that all three modules import without circular edges. Consider an `auth/shared/` sub-package.
- **Effort Estimate:** M (2-3 days, moderate refactoring)

---

### F03 — Duplicate `isKitchenCategory` Across API and Web

- **ID:** F03
- **Title:** Near-identical business logic duplicated in backend and frontend
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/api/src/common/utils/is-kitchen-category.util.ts:1-105` — backend implementation  
  - `apps/web/lib/is-kitchen-category.ts:1-105` — frontend implementation  
  - Both files are 105 lines, identical keyword arrays (DRINK_CATEGORY_KEYWORDS lines 3-28, FOOD_CATEGORY_KEYWORDS lines 30-78), identical algorithm (lines 89-105). Only documentation wording differs slightly.
- **Symptom/Bottleneck/Root Cause:** The logic was developed independently in both stacks. Keeping them in sync requires manual effort and discipline. If one list is updated without the other, API may route items to kitchen while web preview shows them differently.
- **Impact:** Drift risk. Maintenance burden (2x changes for any keyword adjustment).
- **Recommendation:** Move the function and keyword arrays into `packages/types/src/` as a shared pure function (no runtime dependencies). Both API and web import from `@contracts/contracts`.
- **Effort Estimate:** S (0.5 day)

---

### F04 — Dead Code: Deprecated `pin-rate-limiter.ts`

- **ID:** F04
- **Title:** Explicitly deprecated no-op module with zero non-test consumers
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/web/lib/pin-rate-limiter.ts:1-32` — All 4 exported functions are documented as `@deprecated` no-ops  
  - Line 1: `@deprecated Rate limiting de PIN foi migrado para o backend (Redis).`  
  - Lines 15-31: `getPinRateStatus()`, `recordPinFailure()`, `recordPinSuccess()`, `resetPinAttempts()` — all return hardcoded values or do nothing  
  - Only import found: `apps/web/lib/pin-rate-limiter.test.ts:2` (its own test file)
- **Symptom/Bottleneck/Root Cause:** Migration to server-side rate limiting was completed but the client-side module was left in place. No cleanup was performed.
- **Impact:** Negligible runtime impact but degrades codebase hygiene and confuses new developers.
- **Recommendation:** Delete `apps/web/lib/pin-rate-limiter.ts` and `apps/web/lib/pin-rate-limiter.test.ts`.
- **Effort Estimate:** XS (5 minutes)

---

### F05 — Reverse Dependency: Lib imports from Component

- **ID:** F05
- **Title:** `operations-realtime-patching.ts` (lib) depends on a component hook
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/web/lib/operations/operations-realtime-patching.ts:19` — `import type { OperationsRealtimeEnvelope } from '@/components/operations/hooks/use-operations-socket'`  
  - This is the only instance of a lib file importing from components (1 match vs 254 component→lib imports)
- **Symptom/Bottleneck/Root Cause:** The `OperationsRealtimeEnvelope` type is defined inside a component hook file (`use-operations-socket.ts`) rather than in a shared types location. The lib module needs the type but shouldn't depend on a component.
- **Impact:** Circular build dependency risk. Makes `lib/operations/` non-portable. If `use-operations-socket.ts` changes its exports, lib breaks.
- **Recommendation:** Move `OperationsRealtimeEnvelope` type to `lib/operations/operations-types.ts` or `packages/types/src/contracts.ts`. Then import in both lib and component from
 the shared location.
- **Effort Estimate:** S (0.5 day)

---

### F06 — Zero Backend Unit Tests

- **ID:** F06
- **Title:** 131 API module source files with zero test files
- **Severity:** CRITICAL
- **Confidence:** HIGH
- **Evidence:**  
  - `find apps/api/src/modules -name '*.test.ts' -o -name '*.spec.ts'` returns 0 results  
  - Compare: web has 73 component test files + 29 lib test files = 102 test files  
  - Largest untested files: `comanda.service.ts` (1,377 lines), `operations-helpers.service.ts` (722 lines), `orders.service.ts` (633 lines)
- **Symptom/Bottleneck/Root Cause:** Testing was never established for the NestJS backend. All verification relies on manual testing or the frontend test suite.
- **Impact:** No safety net for backend refactoring. The biggest risk area (comanda.service.ts at 1,377 lines) has zero automated verification. Deployments are high-risk.
- **Recommendation:** Start with integration tests for the 3 most critical services (comanda, orders, auth). Use NestJS Test module with an in-memory database. Target 20% file coverage in the first pass.
- **Effort Estimate:** XL (2-4 weeks for foundational coverage)

---

### F07 — Flat `apps/web/lib/` Structure

- **ID:** F07  
- **Title:** 51 files live directly in lib root with only 3 organized subdirectories
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/web/lib/` contains 51 entries (files + subdirectories)  
  - Only 3 subdirectories: `operations/` (16 files), `observability/` (3 files), `printing/` (7 files)  
  - Remaining ~25 .ts files are flat in the root, mixing concerns: API clients (`api-core.ts`, `api-finance.ts`, `api-products.ts`, etc.), utilities (`currency.ts`, `validation.ts`, `utils.ts`), domain logic (`is-kitchen-category.ts`, `product-packaging.ts`, `brazilian-packaged-beverage-catalog.ts`), and auth helpers (`admin-pin.ts`, `authenticated-route.ts`, `pin-input.ts`)
- **Symptom/Bottleneck/Root Cause:** Organic growth without periodic re-organization. Files were added to `lib/` without grouping by concern.
- **Impact:** Harder for new developers to navigate. No clear mental model of what lives where.
- **Recommendation:** Group into subdirectories: `lib/api/` (all api-*.ts files), `lib/domain/` (is-kitchen-category, product-packaging, brazilian-packaged-beverage-catalog), `lib/auth/` (admin-pin, authenticated-route, pin-input, cookie-consent). Keep existing `operations/`, `observability/`, `printing/`.
- **Effort Estimate:** M (1-2 days, mostly import path updates)

---

### F08 — Near-Duplicate Environment Components

- **ID:** F08
- **Title:** Legacy/wireframe duplicates inflate component surface by ~1,700 lines
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **Evidence:**  
  - `apps/web/components/dashboard/environments/portfolio-environment.tsx` — 1,243 lines  
  - `apps/web/components/dashboard/environments/portfolio-legacy-environment.tsx` — 488 lines  
  - `apps/web/components/dashboard/environments/pdv-environment.tsx` — 535 lines  
  - `apps/web/components/dashboard/environments/pdv-wireframe-environment.tsx` — 744 lines  
  - Both pairs import the same `@contracts/contracts` types (`FinanceSummaryResponse`, `ProductRecord`) — `portfolio-environment.tsx:17` and `portfolio-legacy-environment.tsx:5`
- **Symptom/Bottleneck/Root Cause:** In-progress migration from legacy environment components to newer versions. Old versions kept as fallback/reference. "Wireframe" variants may be design-lab previews.
- **Impact:** Duplicate maintenance burden. Bug fixes must be applied to both variants. Confusing for developers to know which is authoritative.
- **Recommendation:** If legacy/wireframe variants are no longer referenced by any active route, delete them. If they serve design-lab previews only, add a clear deprecation comment at the top of each file and a migration deadline.
- **Effort Estimate:** S-M (0.5-1 day investigation + removal/commenting)

---

### F09 — Duplicate "Salao" Component Trees Across pdv/ and dashboard/

- **ID:** F09
- **Title:** Two parallel "salao" component trees with overlapping concerns
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**  
  - `apps/web/components/pdv/salao/` — 5 entries (components/, constants.ts, hooks/, index.ts) with `mesa-card.tsx` (291 lines), `garcom-selector.tsx` (52 lines)  
  - `apps/web/components/dashboard/salao/` — 5 entries (components/, constants.ts, hooks/, index.ts, theme.ts) with `mesa-form-modal.tsx` (301 lines), `modern-operacional-card.tsx` (152 lines)  
  - Both have `components/`, `constants.ts`, `hooks/` sub-structures
- **Symptom/Bottleneck/Root Cause:** Two different contexts (PDV operational view vs Dashboard management view) need similar mesa/table management but were implemented independently.
- **Impact:** Low duplication of effort. Constants and type definitions may drift.
- **Recommendation:** Extract shared mesa types and constants into `components/shared/` or `lib/`. Evaluate whether `components/pdv/salao/components/mesa-card.tsx` and `components/dashboard/salao/components/mesa-list-card.tsx` could share a base component.
- **Effort Estimate:** M (1-2 days)

---

### F10 — Structural Inconsistency: `operations-realtime.module.ts` Placement

- **ID:** F10
- **Title:** Module file lives outside its implementation directory
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/api/src/modules/operations-realtime.module.ts` (at `modules/` level)  
  - Implementation files in `apps/api/src/modules/operations-realtime/` (6 .ts files)  
  - Imports from within the module file use relative paths: `./operations-realtime/operations-realtime.gateway` (line 3), `./operations-realtime/operations-realtime.service` (line 4)  
  - All other modules follow the pattern: `apps/api/src/modules/{name}/{name}.module.ts`
- **Symptom/Bottleneck/Root Cause:** File was created at the wrong level and never moved.
- **Impact:** Confusing for developers used to the standard NestJS convention. Import resolution works but breaks IDE module navigation expectations.
- **Recommendation:** Move `operations-realtime.module.ts` into `apps/api/src/modules/operations-realtime/` and update the 2 files that import it (`app.module.ts:22`, `operations/operations.module.ts:7`).
- **Effort Estimate:** XS (15 minutes)

---

### F11 — Sparse Web Hooks Directory

- **ID:** F11
- **Title:** `hooks/` directory contains only 3 files despite 60K+ lines of components
- **Severity:** LOW (Informational)
- **Confidence:** HIGH
- **Evidence:**  
  - `apps/web/hooks/` — 3 files: `use-activity-timeline.ts`, `use-performance.ts`, `use-pillars.ts`  
  - Meanwhile, component-local hooks are abundant: `components/dashboard/hooks/` (7 files indexed), `components/operations/hooks/`, `components/pdv/salao/hooks/`, `components/pdv/comanda-modal/hooks/`, `components/dashboard/salao/hooks/`, `components/dashboard/settings/hooks/`
- **Symptom/Bottleneck/Root Cause:** Hooks were developed co-located with their consuming components rather than in the shared hooks directory. This is actually a reasonable pattern (colocation).
- **Impact:** Minimal. The top-level `hooks/` directory is underutilized and could be misleading to new developers.
- **Recommendation:** Either promote truly shared hooks here or add a README explaining the colocation pattern.
- **Effort Estimate:** XS (10 minutes)

---

## Positive Observations

1. **Clean barrel files:** All 9 barrel/index.ts files are small (2-7 lines), use `export *` with clear purpose, and serve as module public APIs -- no sprawling re-exports.  
   - `components/operations/index.ts` (2 lines), `lib/operations/index.ts` (6 lines), `packages/types/src/index.ts` (2 lines)  
2. **No frontend-to-backend imports:** Zero instances of web code importing from `apps/api/src/`. The shared types are correctly isolated in `packages/types/` accessed via the `@contracts/contracts` path alias (100 import sites, all `import type`).  
3. **Good frontend test coverage:** 102 test files across components (73) and lib (29). Test files are co-located with source.  
4. **Clean module boundaries in API:** Each domain module (auth, finance, orders, products, etc.) has clear .module.ts, .controller.ts, .service.ts separation. The NestJS DI graph is well-structured despite circular deps.
5. **Moderate nesting depth (max 6):** No insane nesting. Deepest paths are components/pdv/salao/hooks/ and components/dashboard/settings/tabs/ -- both reasonable organizational patterns.
6. **Type-only imports widely used:** @contracts/contracts is imported as import type at 100 sites, ensuring the shared types package does not bloat web bundles.

---

## Risk Summary

| Risk | Finding | Effort |
|---|---|---|
| Critical | F06 -- Zero backend tests (131 files, 0 tests) | XL |
| High | F01 -- God service comanda.service.ts (1,377 lines) | L |
| High | F02 -- 3 circular dependency chains | M |
| Medium | F03 -- Duplicate isKitchenCategory | S |
| Medium | F05 -- Reverse dep: lib-to-component | S |
| Medium | F07 -- Flat lib/ structure (25 ungrouped files) | M |
| Medium | F08 -- Legacy/wireframe duplicates (~1,700 lines) | S-M |
| Low | F04 -- Dead deprecated code (pin-rate-limiter.ts) | XS |
| Low | F09 -- Dual salao component trees | M |
| Low | F10 -- Module file misplaced | XS |
| Low | F11 -- Underutilized hooks/ directory | XS |

---

## Recommendations (Priority Order)

1. **Add backend test scaffolding** -- even 20% coverage on critical paths would significantly reduce deployment risk. Start with comanda.service.ts and orders.service.ts.
2. **Break up comanda.service.ts** -- extract kitchen, payment, and realtime concerns into dedicated services with focused interfaces.
3. **Resolve circular dependencies** -- extract a shared auth-core.module.ts to break Auth <-> Consent <-> Geocoding cycles.
4. **Deduplicate isKitchenCategory** -- move to shared types package.
5. **Fix layer violation** -- move OperationsRealtimeEnvelope type from component hook to lib/operations/operations-types.ts.
6. **Organize lib/** -- group by concern into api/, domain/, auth/ subdirectories.
7. **Clean up dead/legacy code** -- delete pin-rate-limiter.ts, assess and remove or deprecate-mark legacy environment components.
8. **Fix module placement** -- move operations-realtime.module.ts into its directory.
