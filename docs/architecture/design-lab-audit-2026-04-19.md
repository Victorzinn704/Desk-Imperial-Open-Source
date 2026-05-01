# Design-Lab Audit

Date: 2026-04-19
Scope: `apps/web/app/design-lab`, `apps/web/components/design-lab`, `apps/web/components/dashboard/environments`, `apps/web/components/dashboard/payroll-environment.tsx`

## Objective

Define the next cleanup wave for the desktop web so the `design-lab` becomes:

- visually coherent
- dense without looking polluted
- backed by real product logic
- easier to test and split safely

This is an execution map, not a brainstorm note.

---

## Execution Update — 2026-04-20

### Closed in this wave

1. `config` is no longer duplicated in the main sidebar navigation and now uses the account card as the primary entry point.
   - Files:
     - `apps/web/components/design-lab/lab-shell.tsx`
     - `apps/web/components/dashboard/environments/settings-environment.tsx`
     - `apps/web/components/dashboard/dashboard-settings-panel.tsx`
   - Result:
     - cleaner shell navigation
     - clearer settings hierarchy
     - less card-on-card noise inside the settings route

2. `overview` now has a denser and more coherent `lab-native` executive composition.
   - Files:
     - `apps/web/components/dashboard/environments/overview-environment.tsx`
     - `apps/web/components/dashboard/sales-performance-card.tsx`
     - `apps/web/components/dashboard/environments/overview-environment.test.tsx`
   - Result:
     - KPI cards were reduced into a grouped metric strip
     - the performance chart now has a `lab` surface
     - executive reading, radar, recent orders and top products are split into clearer bands

### Next cut

1. `financeiro`
   - reason: same visual instability pattern as the old `overview`, but one step less critical now that the executive entry route is cleaner

2. `portfolio`
   - reason: visually strongest current route, but still oversized and still partially dependent on legacy form surfaces

---

## Executive Read

### What is already on the right path

1. `portfolio` is the current best reference for the new desktop direction.
   - File: `apps/web/components/dashboard/environments/portfolio-environment.tsx`
   - Why: it already encapsulates create/edit/sell flows in dedicated surfaces instead of leaving everything spilled into the main page.
   - Limitation: it is still too large and still pulls legacy form surfaces directly.

2. `caixa` and `cozinha` already use `LabPageHeader`, `LabPanel`, `LabMetric` and clear operational meta rows.
   - Files:
     - `apps/web/app/design-lab/caixa/page.tsx`
     - `apps/web/app/design-lab/cozinha/page.tsx`
   - Why: their page skeleton is closer to `lab-native` than the older dashboard widgets.
   - Limitation: both still embed heavy legacy/other-surface components (`CaixaPanel`, `KitchenOrdersView`) as final desktop UI.

3. `pedidos` is not empty in data or structure.
   - File: `apps/web/components/dashboard/environments/pedidos-environment.tsx`
   - Why: it already has table, timeline, kanban and detail views driven by real orders.
   - Limitation: it still needs density tuning and route-level tests.

4. The shell and route wrappers are now real boundaries and need to be treated that way.
   - Files:
     - `apps/web/components/design-lab/lab-shell.tsx`
     - `apps/web/components/design-lab/design-lab-navigation.ts`
     - `apps/web/components/design-lab/lab-route-tabs.tsx`
     - `apps/web/app/design-lab/layout.tsx`
     - `apps/web/app/design-lab/page.tsx`
   - Why: the lab is no longer a demo folder; these files now control navigation, theme, query-string routing and feature gating for the whole desktop shell.

### What is still mixed or visually unstable

1. `overview` is the main hotspot of mixed visual language.
   - File: `apps/web/components/dashboard/environments/overview-environment.tsx`
   - Problem: the file mixes `Lab*` primitives with legacy pieces like `MetricCard`, `SalesPerformanceCard`, `OverviewTopProducts`, `OverviewRecentOrders`.
   - Effect: the shell says `design-lab`, but part of the page still reads like old dashboard chrome.
   - Extra signal: legacy `imperial-card` branches are still present in this file, so the route is still carrying the previous system inside the new one.

2. `financeiro` is in a similar state, only smaller.
   - File: `apps/web/components/dashboard/environments/financeiro-environment.tsx`
   - Problem: `SalesPerformanceCard` and `FinanceOrdersTable` are still dropped into a new shell instead of being re-composed for the lab.
   - Effect: visual residue, density mismatch, and recurring theme risk.

3. `equipe` and `payroll` are functionally useful but architecturally oversized.
   - Files:
     - `apps/web/components/dashboard/environments/equipe-environment.tsx`
     - `apps/web/components/dashboard/payroll-environment.tsx`
   - Problem: they already read closer to the new product than the old dashboard, but they are too large to evolve safely.

4. `portfolio` is the best current direction, but it still uses a compatibility bridge instead of a pure lab surface.
   - File: `apps/web/components/dashboard/environments/portfolio-environment.tsx`
   - Problem: the page explicitly neutralizes legacy `.imperial-card*` styling inside a lab shell while `ProductForm`, `OrderForm`, `ProductSearchField` and `ProductCard` still carry old dashboard classes.
   - Effect: the route looks better than the others, but part of that cleanliness still depends on CSS suppression instead of native composition.

### What should not lead the next wave

1. `ia`
   - File: `apps/web/app/design-lab/ia/page.tsx`
   - Status: usable surface, not the main visual risk today.

2. `cozinha`
   - File: `apps/web/app/design-lab/cozinha/page.tsx`
   - Status: decent shell, but should be cleaned after the more strategic commercial/financial surfaces.

3. `pedidos`
   - File: `apps/web/components/dashboard/environments/pedidos-environment.tsx`
   - Status: already more coherent than `overview` and `financeiro`; improve after the core executive/product surfaces are stable.

---

## Route Matrix

| Route | Current Source | Current State | Main Risk | Priority |
|---|---|---|---|---|
| `/design-lab/overview` | `DesignLabOverviewEnvironment` | mixed visual system | legacy widgets inside lab shell | P0 |
| `/design-lab/financeiro` | `FinanceiroEnvironment` + `MapEnvironment` | mixed visual system | old financial widgets inside lab shell | P0 |
| `/design-lab/portfolio` | `PortfolioEnvironment` | best current reference | file is too large, forms still legacy | P0 |
| `/design-lab/equipe` | `EquipeEnvironment` | mostly coherent | oversized environment | P1 |
| `/design-lab/payroll` | `PayrollEnvironment` | mostly coherent | oversized environment, no focused tests | P1 |
| `/design-lab/caixa` | page-native + `CaixaPanel` | shell is good | embedded legacy panel dominates final surface | P1 |
| `/design-lab/salao` | `SalaoEnvironment` | functional, likely mature | file size and later visual harmonization | P1 |
| `/design-lab/pdv` | `PdvEnvironment` | functional | still needs density tuning after current cleanup wave | P1 |
| `/design-lab/pedidos` | `PedidosEnvironment` | already structured | route tests and density refinement | P2 |
| `/design-lab/cozinha` | page-native + `KitchenOrdersView` | acceptable shell | mobile kitchen view embedded as desktop final UI | P2 |
| `/design-lab/ia` | page-native + `AIConsultantWorkspace` | acceptable | visual finishing only after core routes | P2 |
| `/design-lab/config` | `SettingsEnvironment` bridge | acceptable | settings panel still comes from old system | P2 |
| `/design-lab/calendario` | page-native | shallow but stable | low business urgency | P3 |

---

## Test Gaps

### High priority

1. `apps/web/components/design-lab/design-lab-navigation.ts`
   - Missing: unit tests for href builders, tab parsers and dashboard-to-lab mapping.
   - Why: route migration and query-string behavior now depend on this file.

2. `apps/web/components/design-lab/lab-route-tabs.tsx`
   - Missing: render/navigation tests for active tab and href wiring.
   - Why: this is the visible subnavigation primitive across lab routes.

3. `apps/web/components/design-lab/lab-shell.tsx`
   - Missing: tests for role-based nav, collapse persistence, theme toggle, mobile overlay and logout.
   - Why: one shell bug now affects every desktop route.

1. `apps/web/app/design-lab/overview/page.tsx`
   - Missing: route render and shell integration test.
   - Why: this route is the executive entry point and currently the most mixed surface.

2. `apps/web/components/dashboard/environments/overview-environment.tsx`
   - Missing: lab-mode tests for variant rendering and executive sections.
   - Why: large file, many variants, many opportunities for regression after extraction.

3. `apps/web/app/design-lab/financeiro/page.tsx`
   - Missing: route test for tab switching and `mapa` branch.
   - Why: this page conditionally swaps environment sources.

4. `apps/web/components/dashboard/environments/financeiro-environment.tsx`
   - Missing: tests for each lab tab (`movimentacao`, `fluxo`, `dre`, `contas`).
   - Why: heavy reuse of finance widgets with multiple visual branches.

5. `apps/web/components/dashboard/environments/equipe-environment.tsx`
   - Missing: tests for `cards`, `perfil`, `folha` split and `surface="lab"` rendering.
   - Why: route behavior changes depending on tab and delegates payroll.

6. `apps/web/components/dashboard/payroll-environment.tsx`
   - Missing: tests for month switcher, payment toggles, CSV export, inline salary updates.
   - Why: high interaction density with no focused protection today.

7. `apps/web/app/design-lab/layout.tsx` and `apps/web/app/design-lab/page.tsx`
   - Missing: tests for feature-flag gating and root redirect behavior.
   - Why: these are small files, but they guard the entire desktop lab entry path.

### Medium priority

1. `apps/web/app/design-lab/pedidos/page.tsx`
   - Missing: route test for `historico -> timeline` alias behavior.

2. `apps/web/components/dashboard/environments/pedidos-environment.tsx`
   - Missing: tests for table/timeline/kanban/detail rendering in `surface="lab"`.

3. `apps/web/app/design-lab/caixa/page.tsx`
   - Missing: route test for shell, KPIs and `CaixaPanel` presence with live query states.

4. `apps/web/app/design-lab/cozinha/page.tsx`
   - Missing: route test for kitchen metrics plus embedded queue states.

5. `apps/web/app/design-lab/config/page.tsx`
   - Missing: route test for settings tab synchronization with query string.

### Current test reality

Only one environment in this cleanup lane already has a dedicated focused test:

- `apps/web/components/dashboard/environments/portfolio-environment.test.tsx`

That makes `portfolio` the current behavioral reference, not just a visual one.

---

## Oversized And Confusing Files

Measured current line counts:

| File | Lines | Reading |
|---|---:|---|
| `apps/web/components/dashboard/environments/portfolio-environment.tsx` | 1397 | too large for a single environment |
| `apps/web/components/dashboard/environments/overview-environment.tsx` | 1219 | too many variants and mixed composition strategies |
| `apps/web/components/dashboard/salao-environment.tsx` | 1087 | mature behavior but high refactor risk |
| `apps/web/components/dashboard/environments/equipe-environment.tsx` | 778 | environment, ranking, directory and profile live together |
| `apps/web/components/pdv/pdv-salao-unified.tsx` | 755 | large operational UI boundary |
| `apps/web/components/dashboard/environments/pdv-wireframe-environment.tsx` | 739 | archived route logic, should stay frozen |
| `apps/web/components/dashboard/environments/financeiro-environment.tsx` | 684 | too many views in one file |
| `apps/web/components/pdv/pdv-comanda-modal.tsx` | 670 | large interaction surface |
| `apps/web/components/dashboard/dashboard-shell.tsx` | 665 | still a frontend hotspot, but not main desktop source now |
| `apps/web/components/dashboard/payroll-environment.tsx` | 650 | interaction-heavy and under-tested |
| `apps/web/components/dashboard/environments/pedidos-environment.tsx` | 614 | manageable, but next in line after P0/P1 |
| `apps/web/app/design-lab/lab.css` | 827 | shell, tokens, compatibility bridge and route visuals still share one stylesheet |
| `apps/web/components/design-lab/lab-shell.tsx` | 308 | high-leverage shell with no dedicated test protection |

### Important note

`docs/architecture/refactoring-candidates-report.md` is still useful, but at least one frontend item is stale: `apps/web/components/operations/use-operations-realtime.ts` is no longer the 1000+ line hotspot described in that report. Re-measure before using old counts as current truth.

`apps/web/components/design-lab/desk-command-center-prototype.tsx` also appears to be an isolated prototype with no active caller in the current desktop path. Confirm usefulness before investing refactor time there.

---

## Natural Refactor Boundaries

### 1. `overview-environment.tsx`

Cut into:

- `overview-snapshot.ts`
- `overview-executive-panels.tsx`
- `overview-variants.tsx`
- `overview-ledgers.tsx`

Reason:
- current file contains both shared snapshot math and multiple page compositions
- the `design-lab` version and the old dashboard variants still live together

### 2. `portfolio-environment.tsx`

Cut into:

- `portfolio-metrics.tsx`
- `portfolio-products-panel.tsx`
- `portfolio-surface-shell.tsx`
- `portfolio-sale-surface.tsx`
- `portfolio-actions.tsx`

Reason:
- current file mixes data shaping, product catalog, sale mode launcher, form shell and action chrome
- this is the route most likely to become the visual reference for the rest of the app

### 3. `financeiro-environment.tsx`

Cut into:

- `financeiro-summary-panels.tsx`
- `financeiro-tab-content.tsx`
- `financeiro-helpers.ts`

Reason:
- tab routing and tab content are mixed in one file
- `SalesPerformanceCard` and `FinanceOrdersTable` should be wrapped or replaced by lab-native surfaces

### 4. `equipe-environment.tsx` + `payroll-environment.tsx`

Cut into:

- `equipe-summary-panels.tsx`
- `equipe-directory.tsx`
- `equipe-profile.tsx`
- `payroll-roster.tsx`
- `payroll-controls.tsx`

Reason:
- team and payroll are already valuable but too coupled
- these routes need stability more than new widgets

### 5. `lab.css`

Cut into:

- `lab-tokens.css`
- `lab-shell.css`
- `lab-surfaces.css`
- `lab-responsive.css`

Reason:
- current stylesheet is not just theme
- the same file owns tokens, shell, tabs, tables, kanban, mesas and compatibility rules
- one small change has too much blast radius

---

## Visual Cleanup Order

### Wave 1 — use `portfolio` as the benchmark

1. `portfolio`
   - finish the last 20%:
   - remove residual visual noise
   - tighten spacing in the catalog table
   - replace the CSS compatibility bridge with lab-native workbench/form surfaces
   - keep the encapsulated create/sell flows as the standard

2. `overview`
   - remove old dashboard widgets from the final lab composition
   - fill empty zones with denser, decision-useful data instead of decorative whitespace
   - keep the executive reading short and strong

3. `financeiro`
   - replace direct legacy blocks with lab-native equivalents
   - avoid chart/table islands that visually read as another system

### Wave 2 — stabilize the management surfaces

4. `equipe`
5. `payroll`
6. `caixa`

### Wave 3 — harmonize the operational surfaces after the stable pattern exists

7. `salao`
8. `pdv`
9. `pedidos`
10. `cozinha`
11. `ia`

This order follows the user-facing business hierarchy:

- first executive/commercial reading
- then management stability
- only then the secondary visual harmonization of already-operational surfaces

---

## Practical Rules For The Next Iteration

1. Do not add new desktop widgets directly from old dashboard components if they bring their own visual language.
   - Use real hooks and data.
   - Re-compose the final UI with `Lab*` primitives.
   - The `lab.css` compatibility bridge is transition-only, not the target design system.

2. Do not treat empty space as elegance if it weakens business reading.
   - Fill dead zones with compact metrics, status ledgers, or short operational context.

3. Do not split files by arbitrary size only.
   - Split by surface boundary and behavioral responsibility.

4. Do not start with `ia`, `cozinha`, or `pedidos` as the next deep cleanup.
   - First lock the pattern in `portfolio`, `overview`, `financeiro`, `equipe`, and `payroll`.

5. For every route promoted to the new pattern, add or update at least one focused test in the same wave.

6. Refactor route boundaries before touching global shell behavior.
   - The next safe order is:
   - `design-lab-navigation.ts`
   - route wrappers
   - environment extraction
   - only then `lab-shell.tsx` and `lab.css`

---

## Immediate Recommendation

Next implementation wave should start here:

1. finish `portfolio`
2. rebuild `overview` in a stricter lab-native composition
3. rebuild `financeiro` with the same pattern
4. only then split `equipe` and `payroll`

That gives the project:

- one visual benchmark
- one executive benchmark
- one financial benchmark
- and only after that, a stable team/payroll foundation

---

## Uniformity System Added In This Wave

The following primitives now define the shared desktop language for repeated lab patterns:

- `LabWorkbench`
- `LabMiniStat`
- `LabSignalRow`
- `LabFactPill`
- `LabFilterChip`

Source:

- `apps/web/components/design-lab/lab-primitives.tsx`

First adoption:

- `apps/web/components/dashboard/environments/portfolio-environment.tsx`

### Why this matters

Before this wave, each section had local variants of the same ideas:

- `*SignalRow`
- `*MiniStat`
- `*HeaderFact`
- `*FilterChip`
- local workbench/modal shells

That creates visual noise and makes future sections feel patched instead of designed. New and migrated lab routes should now reuse these primitives before introducing local chrome.

---

## Section Uniformity Map

| Pattern | Current State | Target |
|---|---|---|
| Triggered full-screen work areas | `portfolio` had a custom workbench; other routes can invent their own | use `LabWorkbench` |
| Compact radar stats | many local `*MiniStat` variants | use `LabMiniStat` |
| Label/note/value rows | many local `*SignalRow` and meta rows | use `LabSignalRow` |
| Header facts and contextual facts | local pill variants | use `LabFactPill` |
| Filters and quick chips | local chip variants | use `LabFilterChip` |
| KPI cards | already mostly shared | use `LabMetric` |
| Dense tables | shared but still desktop-biased | use `LabTable`, then add compact alternatives for tablet/mobile where needed |

### Migration order by impact

1. `portfolio`
   - Status: started.
   - Next: finish catalog mobile compact mode and remove remaining form visual residue.

2. `overview`
   - Replace legacy cards and old widgets with `LabPanel`, `LabMiniStat`, `LabSignalRow`.

3. `financeiro`
   - Replace old financial widgets with lab-native panels and compact table alternatives.

4. `equipe` and `payroll`
   - Replace local mini stats and signal rows first.
   - Then split large files by surface.

5. `pedidos`, `caixa`, `cozinha`
   - Already close to the standard; migrate local rows/stats to primitives.

6. `pdv` and `salao`
   - Bigger operational surfaces; migrate after the above pattern is stable.

---

## Responsiveness And Equity Gates Before Deploy

Required viewports:

- 390 px: phone baseline
- 768 px: tablet portrait
- 1024 px: tablet landscape / small laptop
- 1280 px: compact desktop
- 1440 px: standard desktop

### Current highest risks

1. Shell height and scroll behavior
   - File: `apps/web/components/design-lab/lab-shell.tsx`
   - Risk: fixed viewport shells can cut content in mobile browsers.
   - Action started: use `h-dvh min-h-dvh` instead of plain `h-screen`.

2. Route tabs on smaller screens
   - Files:
     - `apps/web/components/design-lab/lab-route-tabs.tsx`
     - `apps/web/app/design-lab/lab.css`
   - Risk: wrapped tabs can consume too much vertical space.
   - Action started: route tabs become horizontal scroll below tablet widths.

3. KPI values
   - File: `apps/web/components/design-lab/lab-primitives.tsx`
   - Risk: truncating currency values hides the numbers the owner needs.
   - Action started: `LabMetric` value now breaks instead of truncating.

4. Dense tables
   - Highest-risk consumers:
     - `portfolio`
     - `financeiro`
     - `equipe`
     - `pdv`
   - Risk: horizontal scroll alone is not equitable on touch-first devices.
   - Target: add compact row/card alternatives for critical tables below `md` or `lg`.

5. Side rails and fixed-width dashboard panels
   - Files:
     - `financeiro-environment.tsx`
     - `equipe-environment.tsx`
     - `pedidos-environment.tsx`
     - `caixa/page.tsx`
     - `cozinha/page.tsx`
   - Risk: all side rails stack in tablet and can make pages too long.
   - Target: simplify secondary panels on tablet instead of keeping full desktop density.
