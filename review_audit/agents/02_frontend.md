# 02 — Frontend Render Audit Report

**Project:** Desk Imperial  
**Scope:** Next.js rendering — SSR/CSR strategy, client components, hydration, bundle, re-renders, context providers, React patterns  
**Date:** 2026-04-26  
**Auditor:** Frontend Render Specialist Agent (read-only)

---

## Summary

The project has a solid foundation with lazy-loaded heavy environments, TanStack Query, and reasonable useMemo/useCallback usage. However, it suffers from: zero Suspense/loading.tsx boundaries for async data, a monolithic 665-line DashboardShell with 10+ hooks causing cascading re-renders, 57% client components (many unnecessary in design-lab pages), a render-blocking Google Fonts CSS import, only 2 next/image usages across the entire app, no error boundaries for lazy-loaded environments, and a 1275-line OverviewEnvironment without colocation or code-splitting of inline data processing.

---

## Quantitative Evidence

| Metric                                            | Value                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Total .tsx files                                  | ~288                                                                  |
| 'use client' directives (.tsx)                    | 164 (~57%)                                                            |
| 'use client' directives (.ts)                     | 32                                                                    |
| Page .tsx files with 'use client'                 | 19                                                                    |
| Page .tsx files as server components              | ~12 (login, cadastro, financeiro, ai, lite/\*, dashboard/redirect)    |
| loading.tsx files (anywhere)                      | 0                                                                     |
| Suspense usages (all in design-lab pages)         | 5 (all with fallback={null})                                          |
| next/image usages                                 | 2 (product-thumb.tsx, founder-portrait-card.tsx)                      |
| next/font/google usages                           | 1 (layout.tsx — Outfit)                                               |
| next/dynamic call sites                           | ~25 (heavy environments, charts, AG Grid, Framer Motion)              |
| React.memo() usages in dashboard/                 | 10 (mostly salao sub-components)                                      |
| useMemo + useCallback matches                     | ~143 (good adoption in data-heavy components)                         |
| createPortal usages                               | 1 (shared/tooltip.tsx)                                                |
| React.StrictMode                                  | Enabled (next.config.ts:37)                                           |
| Context providers at root                         | 2 (ThemeProvider, QueryProvider)                                      |
| Largest component: overview-environment.tsx       | 1,275 lines                                                           |
| Largest component: portfolio-environment.tsx      | 1,243 lines                                                           |
| Largest component: pdv-wireframe-environment.tsx  | 744 lines                                                             |
| Largest component: dashboard-shell.tsx            | 665 lines                                                             |
| Largest component: pdv-board.tsx                  | 399 lines                                                             |
| Largest lib file: operations-realtime-patching.ts | 1,088 lines                                                           |
| Google Fonts CSS @import in globals.css           | 1 (render-blocking: line 2)                                           |
| Custom CSS files                                  | 3: globals.css (2320 lines), wireframe-shell.css (874 lines), lab.css |
| Tailwind CSS 4                                    | Used via @import 'tailwindcss' in globals.css:4                       |

---

## Findings

### FE-001 — Zero loading.tsx or Suspense Boundaries for Async Data

- **ID:** FE-001
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - Glob for `apps/web/app/**/loading.tsx` returns **0 files** — no loading states for any route segment
  - Only 5 `Suspense` usages found, all in `design-lab/*/page.tsx` with `fallback={null}` (no meaningful loading indicator):
    - `design-lab/pdv/page.tsx:139` — `<Suspense fallback={null}>`
    - `design-lab/financeiro/page.tsx:106` — `<Suspense fallback={null}>`
    - `design-lab/salao/page.tsx:156` — `<Suspense fallback={null}>`
    - `design-lab/pedidos/page.tsx:105` — `<Suspense fallback={null}>`
    - `design-lab/config/page.tsx:37` — `<Suspense fallback={null}>`
  - `dashboard-shell.tsx:193-199` — `sessionQuery` from `useQuery` blocks rendering with `if (isLoading) return <LoadingState />` rather than streaming
  - `pedidos-environment.tsx:44` — hard `if (state.status === 'loading')` pattern, no Suspense delegation
- **Impact:** Every route with async data (auth session, orders, products, employees, finance) is fully client-side rendered with waterfall loading. Users see full-page blocking spinners instead of progressively streamed content. Core Web Vitals LCP is directly penalized.
- **Recommendation:** Add `loading.tsx` to `app/dashboard/`, `app/design-lab/`, and `app/app/`. Wrap async data consumers in `Suspense` with skeleton fallbacks. Use React 19's `use()` or Next.js streaming for the session query to parallelize data loading.
- **Effort:** M (2-3 days — add loading.tsx files + wrap 5-8 query dependencies in Suspense)

---

### FE-002 — Monolithic DashboardShell Component (665 lines) Without Memoization

- **ID:** FE-002
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - `dashboard-shell.tsx:1-665` — single component with:
    - 10 hooks: `useQueryClient` (line 186), `useMobileDetection` x2 (lines 187-188), `useState` (line 189), `useQuery` for session (lines 193-199), `useDashboardMutations` (line 200), `useDashboardNavigation` (lines 205-215), `useDashboardScopedQueries` (lines 217-221), `useScrollMemory` (line 223), `useDashboardLogout` (line 225), `useOperationsRealtime` (line 227)
    - 2 `useCallback` (lines 252-274)
    - 0 `React.memo` on the component or its sub-components
    - 4 sub-components defined in the same file: `DashboardWireframeHeader` (lines 373-501), `WireframeThemeButton` (lines 522-542), `LoadingState` (lines 554-613), `EmailVerificationLockState` (lines 640-664)
  - `WireframeThemeButton` (lines 522-542) uses `useTheme()` — every theme toggle triggers a full 665-line re-render of `DashboardShell` and all its children
  - `DashboardWireframeHeader` (lines 373-501) is 129 lines but defined in the same file with no `React.memo` — the header re-renders on every activeTab/activeSection change
- **Impact:** Any hook state change (navigation, scroll, mobile detection resize) triggers a full re-render through 665 lines of JSX, including all environment components. The header alone processes `navigationGroups.flatMap()` and `sectionTabs.map()` on every render. INP (Interaction to Next Paint) is penalized.
- **Recommendation:** Extract `DashboardWireframeHeader`, `LoadingState`, `UnauthorizedState`, `MobileShellLoadingState` into separate files. Wrap `DashboardWireframeHeader` in `React.memo`. Extract `WireframeThemeButton` to its own memoized component. Split the shell into a layout + content pattern.
- **Effort:** M (1-2 days — pure refactoring extraction)

---

### FE-003 — Massive Environment Components (1275 and 1243 lines)

- **ID:** FE-003
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - `overview-environment.tsx:1-1275` — 1,275 lines with inline formatting functions (lines 51-59), snapshot building, complex rendering logic for 5 variants (principal, layout, meta, operacional, editorial)
  - `portfolio-environment.tsx:1-1243` — 1,243 lines with `useMemo` at lines 195-196, `saleInitialValues` at line 257, `tableRows` at line 863, multiple inline sub-components
  - `pdv-wireframe-environment.tsx:1-744` — 744 lines with 7 `useMemo` blocks, kitchen/comanda logic mixed with rendering
- **Impact:** These massive files are hard to audit, test, and maintain. Each environment re-renders entirely on any hook dependency change. Bundle splitting via `dynamic()` helps initial load but does not prevent the in-component re-render cost.
- **Recommendation:** Split `overview-environment.tsx` into `OverviewPrincipal`, `OverviewLayout`, `OverviewMeta`, `OverviewOperacional`, `OverviewEditorial` sub-components. Extract data processing functions to separate metric files (mirroring the pedidos pattern). Apply `React.memo` to sub-components.
- **Effort:** L (3-4 days — requires careful extraction and regression testing)

---

### FE-004 — No Error Boundaries for Lazy-Loaded Environments

- **ID:** FE-004
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - `dashboard-environments.tsx:10-67` — 8 environments lazy-loaded via `dynamic()` with loading skeletons, but **no `<ErrorBoundary>` wrapper** around any of them
  - Grep for "ErrorBoundary|componentDidCatch" in apps/web returns **0 results** — no error boundaries exist anywhere in the app
  - If any heavy environment (AG Grid, Recharts, react-big-calendar, ApexCharts) throws during lazy load or render, it unmounts the **entire** `DashboardShell` and triggers the root `error.tsx` / `global-error.tsx`
- **Impact:** A crash in the finance chart or calendar view destroys the entire dashboard session. Users must reload and navigate back. This increases reported error rates in Faro observability.
- **Recommendation:** Create a shared `<EnvironmentErrorBoundary>` component wrapping each `dynamic()` call in `renderActiveEnvironment`. Log caught errors to Faro with the environment name. Show a degraded "this section failed" card with a retry button instead of unmounting the shell.
- **Effort:** S (4-6 hours — create one ErrorBoundary + wrap 8 render branches)

---

### FE-005 — Render-Blocking Google Fonts CSS @import in globals.css

- **ID:** FE-005
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - `globals.css:2` — `@import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&family=JetBrains+Mono:wght@400;500;600;700&family=Patrick+Hand&display=swap');`
  - CSS `@import` is render-blocking — the browser must download and parse the imported stylesheet before rendering any content
  - 3 font families loaded via this single import (Architects Daughter, JetBrains Mono, Patrick Hand)
  - The Outfit font is correctly loaded via `next/font/google` in `layout.tsx:2`
- **Impact:** First paint is blocked until the Google Fonts CSS is downloaded and parsed. On slow connections or mobile, this adds 500ms-2s to LCP. Three extra font families add ~50-100KB of font data.
- **Recommendation:** Move all Google Fonts to `next/font/google` in `layout.tsx` with `display: 'swap'`. If these fonts are decorative-only, consider removing them or loading them asynchronously.
- **Effort:** S (2-4 hours — replace @import with next/font/google declarations)

---

### FE-006 — Only 2 next/image Usages; Most Images Unoptimized

- **ID:** FE-006
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - Grep for "Image from 'next/image'" in apps/web/ returns only 2 files:
    - `shared/product-thumb.tsx:3` — uses `fill` with `sizes="64px"`, good but sizes is static (should be responsive)
    - `marketing/founder-portrait-card.tsx:4` — uses `fill` with `sizes="(max-width: 1024px) 320px, 620px"`, correct pattern
  - The landing page (`marketing/landing-page.tsx`) and all other marketing components likely use plain `<img>` tags with no optimization
  - `next.config.ts:38-57` has comprehensive `images` config (remote patterns, AVIF/WebP, device sizes) — but it is underutilized
- **Impact:** Images on the landing page and product thumbnails are served at full resolution without automatic compression, resizing, or lazy loading. This increases LCP and wastes bandwidth on

---

## Findings

### FE-001 — Zero loading.tsx or Suspense Boundaries for Async Data

- **ID:** FE-001
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - Glob for apps/web/app/\*\*/loading.tsx returns 0 files — no loading states for any route segment
  - Only 5 Suspense usages found, all in design-lab/\*/page.tsx with fallback={null} (no meaningful loading indicator):
    - design-lab/pdv/page.tsx:139 — <Suspense fallback={null}>
    - design-lab/financeiro/page.tsx:106 — <Suspense fallback={null}>
    - design-lab/salao/page.tsx:156 — <Suspense fallback={null}>
    - design-lab/pedidos/page.tsx:105 — <Suspense fallback={null}>
    - design-lab/config/page.tsx:37 — <Suspense fallback={null}>
  - dashboard-shell.tsx:193-199 — sessionQuery from useQuery blocks rendering with if (isLoading) return <LoadingState /> rather than streaming
  - pedidos-environment.tsx:44 — hard if (state.status === 'loading') pattern, no Suspense delegation
- **Impact:** Every route with async data (auth session, orders, products, employees, finance) is fully client-side rendered with waterfall loading. Users see full-page blocking spinners instead of progressively streamed content. Core Web Vitals LCP is directly penalized.
- **Recommendation:** Add loading.tsx to app/dashboard/, app/design-lab/, and app/app/. Wrap async data consumers in Suspense with skeleton fallbacks. Use React 19's use() or Next.js streaming for the session query to parallelize data loading.
- **Effort:** M (2-3 days — add loading.tsx files + wrap 5-8 query dependencies in Suspense)

---

### FE-002 — Monolithic DashboardShell Component (665 lines) Without Memoization

- **ID:** FE-002
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - dashboard-shell.tsx:1-665 — single component with:
    - 10 hooks: useQueryClient (line 186), useMobileDetection x2 (lines 187-188), useState (line 189), useQuery for session (lines 193-199), useDashboardMutations (line 200), useDashboardNavigation (lines 205-215), useDashboardScopedQueries (lines 217-221), useScrollMemory (line 223), useDashboardLogout (line 225), useOperationsRealtime (line 227)
    - 2 useCallback (lines 252-274)
    - 0 React.memo on the component or its sub-components
    - 4 sub-components defined in the same file: DashboardWireframeHeader (lines 373-501), WireframeThemeButton (lines 522-542), LoadingState (lines 554-613), EmailVerificationLockState (lines 640-664)
  - WireframeThemeButton (lines 522-542) uses useTheme() — every theme toggle triggers a full 665-line re-render of DashboardShell and all its children
  - DashboardWireframeHeader (lines 373-501) is 129 lines but defined in the same file with no React.memo — the header re-renders on every activeTab/activeSection change
- **Impact:** Any hook state change (navigation, scroll, mobile detection resize) triggers a full re-render through 665 lines of JSX, including all environment components. The header alone processes navigationGroups.flatMap() and sectionTabs.map() on every render. INP (Interaction to Next Paint) is penalized.
- **Recommendation:** Extract DashboardWireframeHeader, LoadingState, UnauthorizedState, MobileShellLoadingState into separate files. Wrap DashboardWireframeHeader in React.memo. Extract WireframeThemeButton to its own memoized component. Split the shell into a layout + content pattern.
- **Effort:** M (1-2 days — pure refactoring extraction)

### FE-003 — Massive Environment Components (1275 and 1243 lines)

- **ID:** FE-003
- **Severity:** HIGH
- **Confidence:** HIGH
- **Evidence:**
  - overview-environment.tsx:1-1275 — 1,275 lines with inline formatting functions (lines 51-59), snapshot building, complex rendering logic for 5 variants (principal, layout, meta, operacional, editorial)
  - portfolio-environment.tsx:1-1243 — 1,243 lines with useMemo at lines 195-196, saleInitialValues at line 257, tableRows at line 863, multiple inline sub-components
  - pdv-wireframe-environment.tsx:1-744 — 744 lines with 7 useMemo blocks, kitchen/comanda logic mixed with rendering
- **Impact:** These massive files are hard to audit, test, and maintain. Each environment re-renders entirely on any hook dependency change. Bundle splitting via dynamic() helps initial load but does not prevent the in-component re-render cost.
- **Recommendation:** Split overview-environment.tsx into OverviewPrincipal, OverviewLayout, OverviewMeta, OverviewOperacional, OverviewEditorial sub-components. Extract data processing functions to separate metric files (mirroring the pedidos pattern). Apply React.memo to sub-components.
- **Effort:** L (3-4 days — requires careful extraction and regression testing)

---

### FE-004 — No Error Boundaries for Lazy-Loaded Environments

- **ID:** FE-004
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - dashboard-environments.tsx:10-67 — 8 environments lazy-loaded via dynamic() with loading skeletons, but no ErrorBoundary wrapper around any of them
  - Grep for ErrorBoundary or componentDidCatch in apps/web returns 0 results — no error boundaries exist anywhere in the app
  - If any heavy environment (AG Grid, Recharts, react-big-calendar, ApexCharts) throws during lazy load or render, it unmounts the entire DashboardShell and triggers the root error.tsx / global-error.tsx
- **Impact:** A crash in the finance chart or calendar view destroys the entire dashboard session. Users must reload and navigate back. This increases reported error rates in Faro observability.
- **Recommendation:** Create a shared EnvironmentErrorBoundary component wrapping each dynamic() call in renderActiveEnvironment. Log caught errors to Faro with the environment name. Show a degraded section failed card with a retry button instead of unmounting the shell.
- **Effort:** S (4-6 hours — create one ErrorBoundary + wrap 8 render branches)

---

### FE-005 — Render-Blocking Google Fonts CSS @import in globals.css

- **ID:** FE-005
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - globals.css:2 — @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&family=JetBrains+Mono:wght@400;500;600;700&family=Patrick+Hand&display=swap');
  - CSS @import is render-blocking — the browser must download and parse the imported stylesheet before rendering any content
  - 3 font families loaded via this single import (Architects Daughter, JetBrains Mono, Patrick Hand)
  - The Outfit font is correctly loaded via next/font/google in layout.tsx:2
- **Impact:** First paint is blocked until the Google Fonts CSS is downloaded and parsed. On slow connections or mobile, this adds 500ms-2s to LCP. Three extra font families add ~50-100KB of font data.
- **Recommendation:** Move all Google Fonts to next/font/google in layout.tsx with display: swap. If these fonts are decorative-only, consider removing them or loading them asynchronously.
- **Effort:** S (2-4 hours — replace @import with next/font/google declarations)

---

### FE-006 — Only 2 next/image Usages; Most Images Unoptimized

- **ID:** FE-006
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - Grep for Image from next/image in apps/web/ returns only 2 files:
    - shared/product-thumb.tsx:3 — uses fill with sizes=64px, good but sizes is static (should be responsive)
    - marketing/founder-portrait-card.tsx:4 — uses fill with sizes=(max-width: 1024px) 320px, 620px, correct pattern
  - The landing page (marketing/landing-page.tsx) and all other marketing components likely use plain img tags with no optimization
  - next.config.ts:38-57 has comprehensive images config (remote patterns, AVIF/WebP, device sizes) — but it is underutilized
- **Impact:** Images on the landing page and product thumbnails are served at full resolution without automatic compression, resizing, or lazy loading. This increases LCP and wastes bandwidth on mobile.
- **Recommendation:** Audit all img tags in marketing/ and pdv/ and replace with next/image. For the landing page hero, use priority prop. Add placeholder=blur for known images.
- **Effort:** M (1-2 days — audit ~15-20 image instances)

### FE-007 — localStorage Access Without SSR Guard in lab-shell.tsx

- **ID:** FE-007
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - lab-shell.tsx:89-100 — getStoredBoolean() function has SSR guard on line 90: if (typeof window === 'undefined') { return fallback } — safe
  - lab-shell.tsx:206 — localStorage.setItem(COLLAPSED_KEY, String(collapsed)) — called inside a React event handler (button onClick), so it only runs on the client — safe
  - owner-pwa-install-prompt.tsx:33 — window.sessionStorage.getItem(DISMISS_KEY) — guarded by useState initializer pattern — safe
- **Impact:** The actual risk is low — all localStorage/sessionStorage access is either SSR-guarded or inside client-only event handlers. This finding is downgraded but kept for awareness.
- **Recommendation:** Add documentation comments marking intentional client-only access on these lines. Verify all new browser API calls have SSR guards.
- **Effort:** S (1 hour — audit + documentation comments)

---

### FE-008 — lazy-components.tsx Marked as Client Component Unnecessarily

- **ID:** FE-008
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - shared/lazy-components.tsx:1 — 'use client'
  - The file only exports dynamic() calls (lines 59-78) and skeleton components (lines 11-49)
  - dynamic() is a server-compatible function — it can be called in server components
  - Skeleton components are pure JSX with no hooks, no state, no event handlers — they could be server components
  - Marking this file 'use client' means any file that imports from it also becomes a client boundary
- **Impact:** Files importing LazyAgGrid, LazyMotionDiv, etc. from this module are forced into the client bundle if they share the same import boundary. This may prevent server-side rendering of layouts that only need the lazy component references.
- **Recommendation:** Remove 'use client' from lazy-components.tsx. Skeleton components are pure presentational and work fine as server components. dynamic() calls are server-compatible.
- **Effort:** S (30 minutes — remove directive + verify no regressions)

---

### FE-009 — Framer Motion Directly Imported Despite Lazy Variants Existing

- **ID:** FE-009
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - marketing/founder-contact-card.tsx:3 — import { motion } from 'framer-motion' (direct import, ~150KB)
  - marketing/landing-page.tsx:7 — import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion' (direct import)
  - shared/lazy-components.tsx:68-78 — already exports LazyMotionDiv, LazyMotionLi, LazyAnimatePresence but nobody imports them
  - next.config.ts:63 — optimizePackageImports includes framer-motion for tree-shaking, partially mitigating
- **Impact:** The landing page (likely the first page users see) downloads the full Framer Motion bundle (~150KB). This delays LCP for marketing/landing page visitors who may not need animations.
- **Recommendation:** On the landing page, consider using CSS animations for hero effects instead of Framer Motion, or lazy-load the animated sections. For inner marketing components, use the LazyMotionDiv / LazyAnimatePresence wrappers.
- **Effort:** S (2-4 hours — replace imports with lazy variants + add CSS fallback animations)

---

### FE-010 — useMobileDetection Causes Resize-Triggered Re-Renders Without Debounce

- **ID:** FE-010
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **Evidence:**
  - hooks/useMobileDetection.ts:1-23 — useEffect adds window.addEventListener(resize, check) with no debounce (line 18)
  - Every pixel of window resize triggers setIsMobile(), which causes a full re-render of DashboardShell (665 lines)
  - Two instances in dashboard-shell.tsx:187-188:
    - const { isMobile } = useMobileDetection() — 960px breakpoint
    - const { isMobile: isCompactDesktop } = useMobileDetection(COMPACT_DESKTOP_BREAKPOINT) — 1366px breakpoint
  - Desktop users dragging a window between 960-1366px will trigger hundreds of re-renders
- **Impact:** Severe jank during window resize on desktop. Both mobile shell environments (StaffMobileShell, OwnerMobileShell) are conditionally rendered based on isMobile, so resizing causes component mount/unmount cycles.
- **Recommendation:** Add a 200ms debounce to the resize listener. Use useRef for the breakpoint and only update state when the threshold actually crosses (not on every intermediate pixel). Consider CSS media queries for mobile/desktop toggling instead of conditional rendering.
- **Effort:** S (1-2 hours — add debounce + threshold-crossing detection)

---

### FE-011 — Toaster Rendered Outside ThemeProvider Context

- **ID:** FE-011
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - app/layout.tsx:60-66 — The Toaster is rendered after the ThemeProvider closing tag, meaning it cannot access the theme context
  - It relies on theme=system prop (line 68) which uses prefers-color-scheme media query — this works but bypasses the manual theme toggle
- **Impact:** If the user toggles dark/light mode via the theme button, toasts will not follow the theme — they will follow the OS preference only. Minor visual inconsistency.
- **Recommendation:** Move Toaster inside ThemeProvider. If there is a reason it is outside (e.g., Portal mounting), use next-themes useTheme in a client wrapper component.
- **Effort:** S (15 minutes — move JSX element inside provider)

---

### FE-012 — All Design-Lab Pages Are Client Components (19 pages)

- **ID:** FE-012
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - All 16 pages under app/design-lab/ have use client on line 1
  - All 3 pages under app/app/ (owner, staff, owner/cadastro-rapido) have use client on line 1
  - The design-lab/layout.tsx is a server component (no use client) that imports LabShell — correct pattern
  - However, the pages themselves add use client even though their primary purpose is to pass through to LabShell (which is already a client component)
- **Impact:** These pages cannot benefit from any server-side data fetching optimizations. Metadata, SEO, and initial HTML payload are all client-generated. While this is acceptable for an authenticated SPA-like dashboard, it represents missed opportunities for progressive enhancement.
- **Recommendation:** Where pages only re-export client components with no interactive behavior, experiment with removing use client and using a wrapper client component for interactivity. Pages that fetch data via useQuery can keep use client but add loading.tsx for the shell.
- **Effort:** M (1-2 days — audit each page for interactive vs pass-through behavior)
