# Quality Warning Map

**Generated at:** 2026-05-02T03:09:57.031Z
**Scope:** current local workspace
**Status:** alert active

---

## Executive Alert

| Level   | Source       | Message                                            |
| ------- | ------------ | -------------------------------------------------- |
| warning | eslint       | 707 ESLint warning(s) found                        |
| warning | coverage:web | line coverage is 66.27%                            |
| warning | sonar        | Sonar /api/measures/component failed with HTTP 401 |

---

## ESLint Baseline

- Files analyzed: 888
- Errors: 0
- Warnings: 707
- Fixable warnings: 152

### Top ESLint Rules

| Rule                                     | Count |
| ---------------------------------------- | ----- |
| max-lines-per-function                   | 271   |
| react/jsx-sort-props                     | 95    |
| complexity                               | 71    |
| no-nested-ternary                        | 71    |
| @typescript-eslint/no-non-null-assertion | 64    |
| sort-imports                             | 57    |
| max-lines                                | 56    |
| max-params                               | 20    |
| @typescript-eslint/no-unused-vars        | 1     |
| react-hooks/incompatible-library         | 1     |

### Top ESLint Files

| File                                                                 | Count |
| -------------------------------------------------------------------- | ----- |
| apps/web/components/dashboard/salao-environment.tsx                  | 23    |
| apps/web/components/calendar/commercial-calendar.tsx                 | 21    |
| apps/web/components/dashboard/environments/overview-environment.tsx  | 18    |
| apps/web/components/design-lab/lab-primitives.tsx                    | 17    |
| apps/api/src/modules/operations/comanda.service.ts                   | 14    |
| apps/api/src/modules/products/products.service.ts                    | 14    |
| apps/web/components/ai/ai-consultant-workspace.tsx                   | 14    |
| apps/web/components/dashboard/overview-recent-orders.tsx             | 12    |
| apps/api/src/modules/auth/auth-registration.service.ts               | 11    |
| apps/api/src/modules/orders/orders.service.ts                        | 11    |
| apps/web/components/dashboard/environments/financeiro-tab-panels.tsx | 11    |
| apps/web/components/dashboard/environments/portfolio-environment.tsx | 11    |
| apps/web/components/lite/lite-pdv-kanban.tsx                         | 10    |
| apps/api/src/modules/auth/auth-login.service.ts                      | 9     |
| apps/web/app/design-lab/cadastro-rapido/page.tsx                     | 9     |

---

## Sonar Baseline

Sonar unavailable: Sonar /api/measures/component failed with HTTP 401

---

## Coverage Baseline

### api

| Metric     | Pct    |
| ---------- | ------ |
| lines      | 90.54% |
| branches   | 75.21% |
| functions  | 91.96% |
| statements | 90.72% |

| File                                                                    | Lines pct | Uncovered lines |
| ----------------------------------------------------------------------- | --------- | --------------- |
| apps/api/src/modules/admin-pin/admin-pin.service.ts                     | 79.69%    | 27              |
| apps/api/src/common/services/cache.service.ts                           | 71.76%    | 24              |
| apps/api/src/modules/auth/auth-login.service.ts                         | 76%       | 24              |
| apps/api/src/modules/operations/operations-helpers.service.ts           | 85%       | 24              |
| apps/api/src/modules/auth/auth-session.service.ts                       | 80.18%    | 22              |
| apps/api/src/modules/employees/employees.service.ts                     | 75%       | 22              |
| apps/api/src/modules/finance/finance.service.ts                         | 83.07%    | 22              |
| apps/api/src/modules/market-intelligence/market-intelligence.service.ts | 83.01%    | 18              |
| apps/api/src/modules/auth/auth-login-actor.utils.ts                     | 63.63%    | 16              |
| apps/api/src/modules/operations/operations-auth.utils.ts                | 55.55%    | 16              |

### web

| Metric     | Pct    |
| ---------- | ------ |
| lines      | 66.27% |
| branches   | 53.61% |
| functions  | 62.82% |
| statements | 65.62% |

| File                                                                 | Lines pct | Uncovered lines |
| -------------------------------------------------------------------- | --------- | --------------- |
| apps/web/components/dashboard/salao-environment.tsx                  | 0.97%     | 203             |
| apps/web/components/calendar/commercial-calendar.tsx                 | 23.11%    | 143             |
| apps/web/components/dashboard/settings/components/pin-setup-card.tsx | 0.78%     | 127             |
| apps/web/components/staff-mobile/use-staff-mobile-shell-mutations.ts | 24.03%    | 98              |
| apps/web/hooks/performance-web-vitals.ts                             | 1.33%     | 74              |
| apps/web/components/dashboard/salao/hooks/use-mesa-drag.ts           | 0%        | 61              |
| apps/web/components/dashboard/environments/overview-environment.tsx  | 35.48%    | 60              |
| apps/web/components/operations/use-operations-realtime.ts            | 72.98%    | 57              |
| apps/web/lib/admin-pin.ts                                            | 43.18%    | 50              |
| apps/web/components/dashboard/caixa-panel.tsx                        | 48.38%    | 48              |

---

## Attack Plan

### P0 - Security hotspots review

Sonar is unavailable, so hotspot status cannot be trusted yet.

- Run Sonar locally and regenerate this map before changing security-sensitive code.

### P1 - Coverage holes by uncovered lines

Quality Gate fails on new coverage and global coverage is below the target for safe feature work.

- apps/api/src/modules/admin-pin/admin-pin.service.ts: 27 uncovered line(s)
- apps/api/src/common/services/cache.service.ts: 24 uncovered line(s)
- apps/api/src/modules/auth/auth-login.service.ts: 24 uncovered line(s)
- apps/api/src/modules/operations/operations-helpers.service.ts: 24 uncovered line(s)
- apps/web/components/dashboard/salao-environment.tsx: 203 uncovered line(s)
- apps/web/components/calendar/commercial-calendar.tsx: 143 uncovered line(s)
- apps/web/components/dashboard/settings/components/pin-setup-card.tsx: 127 uncovered line(s)
- apps/web/components/staff-mobile/use-staff-mobile-shell-mutations.ts: 98 uncovered line(s)

### P2 - High-volume mechanical Sonar smells

These rules clear many issues with low behavior risk when tested per touched surface.

- S6759: convert React props to Readonly props by component cluster.
- S3358/S7735: replace nested or negated conditions with named statements.
- S7764: use globalThis/globalThis.window in browser guards.
- S7781/S6582: use replaceAll and optional chaining where behavior is identical.

### P3 - Bloaters and complex flow refactors

Large files need behavior tests before extraction.

- Start with operations-realtime-patching buildComandaFromPayload mapping extraction.
- Then staff/owner mobile shells after mobile coverage is active.
- Leave ComandaService for a dedicated contract-protected pass.

### P4 - ESLint warning budget

Warnings should become a managed budget instead of terminal noise.

- Current ESLint baseline: 707 warning(s), 0 error(s).
- Reduce by cluster and update this report after each cleanup.
- Do not enable fail-on-alert until the baseline is intentionally accepted.

---

## Commands

```powershell
npm run quality:warnings
npm run quality:scope:strict
npm run quality:contracts
npm run quality:preflight
```

The complete warning list is stored in `review_audit/generated/quality-warning-map.json`.
