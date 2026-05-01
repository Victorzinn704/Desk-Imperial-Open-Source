# Quality Warning Map

**Generated at:** 2026-04-26T19:43:42.297Z
**Scope:** current local workspace
**Status:** alert active

---

## Executive Alert

| Level   | Source       | Message                     |
| ------- | ------------ | --------------------------- |
| warning | eslint       | 855 ESLint warning(s) found |
| warning | coverage:web | line coverage is 69.11%     |
| warning | sonar        | fetch failed                |

---

## ESLint Baseline

- Files analyzed: 712
- Errors: 0
- Warnings: 855
- Fixable warnings: 160

### Top ESLint Rules

| Rule                                     | Count |
| ---------------------------------------- | ----- |
| max-lines-per-function                   | 320   |
| no-nested-ternary                        | 124   |
| react/jsx-sort-props                     | 106   |
| complexity                               | 95    |
| @typescript-eslint/no-non-null-assertion | 77    |
| max-lines                                | 63    |
| sort-imports                             | 53    |
| max-params                               | 15    |
| react-hooks/incompatible-library         | 1     |
| unknown                                  | 1     |

### Top ESLint Files

| File                                                                     | Count |
| ------------------------------------------------------------------------ | ----- |
| apps/web/components/dashboard/environments/pedidos-environment.tsx       | 25    |
| apps/web/components/dashboard/salao-environment.tsx                      | 23    |
| apps/web/components/calendar/commercial-calendar.tsx                     | 20    |
| apps/web/app/api/barcode/lookup/route.ts                                 | 19    |
| apps/web/components/dashboard/environments/overview-environment.tsx      | 18    |
| apps/api/src/modules/operations/comanda.service.ts                       | 17    |
| apps/web/components/design-lab/lab-primitives.tsx                        | 17    |
| apps/web/components/design-lab/lab-shell.tsx                             | 15    |
| apps/api/src/modules/products/products.service.ts                        | 14    |
| apps/web/components/ai/ai-consultant-workspace.tsx                       | 14    |
| apps/web/components/dashboard/environments/pdv-wireframe-environment.tsx | 14    |
| apps/web/components/dashboard/environments/equipe-environment.tsx        | 12    |
| apps/web/components/dashboard/overview-recent-orders.tsx                 | 12    |
| apps/web/components/staff-mobile/kitchen-orders-view.tsx                 | 12    |
| apps/api/src/modules/auth/auth-registration.service.ts                   | 11    |

---

## Sonar Baseline

Sonar unavailable: fetch failed

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
| lines      | 69.11% |
| branches   | 60%    |
| functions  | 66.18% |
| statements | 68.47% |

| File                                                                 | Lines pct | Uncovered lines |
| -------------------------------------------------------------------- | --------- | --------------- |
| apps/web/components/staff-mobile/staff-mobile-shell.tsx              | 44.72%    | 131             |
| apps/web/components/dashboard/settings/components/pin-setup-card.tsx | 0.84%     | 118             |
| apps/web/components/dashboard/order-form.tsx                         | 2.4%      | 81              |
| apps/web/components/calendar/commercial-calendar.tsx                 | 37.61%    | 68              |
| apps/web/components/owner-mobile/owner-mobile-shell.tsx              | 55.33%    | 67              |
| apps/web/lib/admin-pin.ts                                            | 44.31%    | 49              |
| apps/web/components/dashboard/caixa-panel.tsx                        | 46.25%    | 43              |
| apps/web/components/dashboard/dashboard-sidebar.tsx                  | 4.65%     | 41              |
| apps/web/components/dashboard/settings/tabs/session-tab.tsx          | 0%        | 36              |
| apps/web/lib/operations/operations-realtime-patching.ts              | 90.24%    | 36              |

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
- apps/web/components/staff-mobile/staff-mobile-shell.tsx: 131 uncovered line(s)
- apps/web/components/dashboard/settings/components/pin-setup-card.tsx: 118 uncovered line(s)
- apps/web/components/dashboard/order-form.tsx: 81 uncovered line(s)
- apps/web/components/calendar/commercial-calendar.tsx: 68 uncovered line(s)

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

- Current ESLint baseline: 855 warning(s), 0 error(s).
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
