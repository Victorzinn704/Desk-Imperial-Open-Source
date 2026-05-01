# 03 — Responsive / Mobile Audit Report

**Project:** Desk Imperial
**Scope:** Mobile UX patterns, tap targets, gesture support, offline state, PWA, responsive breakpoints, dark/light mode, contrast ratios, focus indicators, barcode scanner, viewport issues
**Date:** 2026-04-26
**Auditor:** Responsive/Mobile Specialist Agent (read-only)

---

## Summary

Score: **7.0 / 10**

The mobile shells are well-architected with bottom navigation, pull-to-refresh, comprehensive offline queue (IndexedDB + Background Sync), dual-path barcode scanning (native BarcodeDetector API + @zxing/browser fallback), and proper safe-area awareness. PWA manifests are correctly configured with shortcuts and standalone display. Dark/light mode tokens are complete in both the main theme and lab theme.

Key gaps: the owner bottom nav with 6 columns is tight at 360px, several touch targets fall below the 48px recommended minimum (header buttons at 36-40px, dismiss button at 32px), no focus-visible indicators on bottom nav items or table grid cards, and small 10px text with `text-soft` color may fail WCAG AA contrast in light mode. The `ConnectionBanner` overflow risk and missing `screenshots` in the owner manifest are minor but notable.

---

## Quantitative Evidence

| Metric | Value |
|---|---|
| Mobile shell components (staff-mobile/) | 20 files (11 .tsx, 7 .ts, 2 .test.tsx) |
| Mobile shell components (owner-mobile/) | 56 files (30 .tsx, 23 .ts, 3 .test.tsx) |
| Lite PWA pages | 3 pages (lite/, lite/pwa, lite/web) |
| PWA manifests | 2 (manifest.json, manifest-lite.json) |
| Service Worker registrars | 1 (shared/sw-registrar.tsx) |
| Offline queue mechanism | 1 (shared/use-offline-queue.ts, 188 lines) |
| Barcode scanner integration | 1 (owner-barcode-scanner-sheet.tsx, 410 lines) |
| Pull-to-refresh hook | 1 (shared/use-pull-to-refresh.ts, 111 lines) |
| Haptic feedback utility | 1 (shared/haptic.ts, 43 lines) |
| Connection status banner | 1 (shared/connection-banner.tsx, 66 lines) |
| Bottom nav tabs (staff) | 4 (Mesas, Cozinha, Pedidos, Histórico) |
| Bottom nav tabs (owner) | 6 (Hoje, Comandas, PDV, Caixa, Financeiro, Conta) |
| Tailwind breakpoints used | sm (640), md (768), min-[420px], max-[640px] |
| Touch device CSS guard | `@media (pointer: coarse)` in globals.css:39-62 |
| `hover: none` media queries | globals.css (imperial-card-tilt), lab.css mag cards |
| CSS theme systems | 2 (globals.css :root/.dark + lab.css [data-lab].lab-dark/.lab-light) |
| `prefers-reduced-motion` support | globals.css:11-36 |
| Google Fonts loaded | 4 (Outfit via next/font, 3 via CSS @import) |

---

## Findings

### MOB-001 — Owner Bottom Nav Has 6 Columns, Overcrowded at 360px

- **ID:** MOB-001
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - `owner-mobile-shell-bottom-nav.tsx:94` — `grid-cols-6` with `gap-0.5` (2px) and `p-1` (4px)
  - At 360px viewport: each column = (360 - 16 - 10) / 6 ≈ 55.7px wide
  - Nav items (`min-h-[3.35rem]` = 53.6px) with 22px icons and labels at `text-[10px]` with `tracking-wide`
  - Longest label "Financeiro" at 10px with tracking-wide = ~100px text width, will either overflow or clip
  - Active indicator `rounded-[1.2rem]` (19.2px radius) inside a ~54px wide cell — the highlight shape is cramped
  - Compare: staff has 4 columns at same viewport = ~84.5px each — comfortable
- **Impact:** On 360px screens (iPhone SE, small Androids), the 6-item bottom nav has illegible labels and tight spacing. Users may mis-tap adjacent tabs. The "Financeiro" label likely overflows its container.
- **Recommendation:** Switch owner bottom nav to a 5-column grid (merge Caixa+Financeiro, or use scrollable nav chips) on screens below 400px. Alternatively, reduce icon size to 18px and use text-[9px] labels conditionally via a CSS media query at ~400px. Consider grouping into primary 4 tabs + overflow menu for configurations.
- **Effort:** M (3-4 hours — change grid layout + add responsive variant + test on emulated 360px)

---

### MOB-002 — Header Touch Targets Below 48px Recommended Minimum

- **ID:** MOB-002
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - `staff-mobile-shell-header.tsx:43` — logout button `size-9` (36px) on mobile, `size-10` (40px) on sm+
  - `owner-mobile-shell-header.tsx:55-63` — logout button `size-9` (36px) on mobile, `size-10` (40px) on sm+
  - `owner-barcode-scanner-sheet.tsx:259` — close scanner button `size-10` (40px)
  - `owner-pwa-install-prompt.tsx:159` — dismiss button `size-8` (32px)
  - `mobile-order-builder.tsx:287` — secondary action button `min-h-[40px]` (40px) — close but below 48px
  - The globals.css `@media (pointer: coarse)` rule (line 39-50) sets `min-height: 44px` on buttons — but explicit Tailwind class `size-9` (36px) **overrides** the CSS min-height since size-9 sets explicit height/width
  - Staff shell nav items: `min-h-[3.35rem]` (53.6px) — above 48px, correct
  - Order builder +/- buttons: `size-11` (44px) — close enough but still 4px below 48px ideal
- **Impact:** Users on touch devices must precisely target 36-40px buttons at the top of the screen. The logout and close actions are critical (security/logout risk). Dismiss at 32px is particularly difficult — on iPhone SE, the dismiss tap target is physically ~3.5mm wide.
- **Recommendation:** Bump header action buttons to `size-11` (44px) minimum with `min-[44px]` TouchableOpacity — expanding invisible hit area via CSS pseudo-element or padding. Increase PWA dismiss button to `size-10` (40px) minimum. The `@media (pointer: coarse)` rule should use `!important` on min-height/min-width for buttons to override explicit Tailwind classes.
- **Effort:** S (1-2 hours — bump 6 button sizes + add `!important` to pointer:coarse rule)

---

### MOB-003 — No Focus-Visible Indicators on Bottom Nav Items or Table Grid Cards

- **ID:** MOB-003
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Evidence:**
  - `staff-mobile-shell-bottom-nav.tsx:39-71` — `StaffMobileShellNavItem` button has `active:scale-95` but no `focus-visible:` styles
  - `owner-mobile-shell-bottom-nav.tsx:50-78` — `OwnerMobileShellNavButton` same pattern — no `focus-visible:` ring or outline
  - `mobile-table-grid.tsx:146-177` — `onSelectMesa` buttons have `active:scale-95` and `WebkitTapHighlightColor: 'transparent'` but no `focus-visible:` outline
  - `button.tsx` shared component has `focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.45)] focus-visible:ring-offset-2` — but mobile nav items and table cards are custom `<button>` elements that don't use the shared `Button` component
  - `select-field.tsx:22` — `<select>` has `focus:border-[var(--accent)] focus:ring-1` — but ring-1 (1px) is thin and may be invisible on some screens
- **Impact:** Keyboard and accessibility switch users navigating the mobile shell via Tab cannot identify which element is focused. Screen reader users relying on focus indicators lose spatial orientation. This is a WCAG 2.4.7 (Focus Visible) violation at Level AA.
- **Recommendation:** Add `focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]` to all interactive mobile shell elements. For the bottom nav, add a visible border/focus ring on the active indicator element as well. The `pointer: coarse` media query should not suppress focus indicators (focus is different from hover).
- **Effort:** S (1-2 hours — add focus-visible classes to ~12 interactive elements across 4 files)

---

### MOB-004 — Small Text (10px) at Low Contrast May Fail WCAG AA in Light Mode

- **ID:** MOB-004
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - Nav labels at `text-[10px]` with `text-[var(--text-soft)]` — in light mode, text-soft is `#475569`
  - Background: `var(--bg)` = `#f8fafc`
  - Contrast ratio: ~4.8:1 for #475569 on #f8fafc — this meets WCAG AA for large text (≥18px or bold ≥14px) and WCAG AAA (7:1) for large text, but **fails WCAG AA for normal text** (requires 4.5:1, which 4.8:1 barely passes). The 10px size is classified as "normal" text, requiring 4.5:1 — so this passes.
  - However, `text-[var(--text-soft,#7a8896)]` fallback `#7a8896` on `#f8fafc` = ~3.0:1 — **fails WCAG AA** at normal text size
  - The fallback color #7a8896 is used as default if the CSS variable isn't set.
  - `text-[10px] text-[var(--text-soft,#7a8896)]` appears in: mobile-table-grid.tsx (summary labels, card descriptions), mobile-order-builder.tsx (helper text, meta info), owner-mobile-shell (status text)
  - Badge text at `text-[10px]` in white `text-[var(--on-accent)]` on accent background has high contrast — no issue
- **Impact:** Users in light mode with failed CSS variable references see 10px text at 3.0:1 contrast — unreadable for low-vision users. The primary path (CSS variable present) is fine, but the fallback color is problematic.
- **Recommendation:** Change all `var(--text-soft, #7a8896)` fallbacks to `var(--text-soft, #475569)` to match the actual CSS variable light-mode value. The #7a8896 appears to be a dark-mode value used accidentally in the light-mode fallback. Audit all 10px text instances and ensure minimum contrast of 4.5:1.
- **Effort:** S (1 hour — find-replace fallback color in 10 files)

---

### MOB-005 — Owner PWA Manifest Missing Screenshots for Install Prompt

- **ID:** MOB-005
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - `public/manifest.json:42` — `"screenshots": []` — empty array
  - `public/manifest-lite.json` — no `screenshots` key at all
  - Google requires at least 1 screenshot (1280x720 or larger) for the PWA install dialog to show rich preview
  - Without screenshots, the install prompt shows only the app name and icon — a generic dialog
  - Other PWA fields are well-configured: `shortcuts`, `launch_handler`, `handle_links`, `edge_side_panel`
- **Impact:** When users trigger the PWA install prompt (via `beforeinstallprompt` event or browser menu), they see a bare dialog without app preview images. This reduces install conversion rate. The `OwnerPwaInstallPrompt` component correctly handles the event flow (prompt → userChoice → outcome), but the native dialog lacks visual appeal.
- **Recommendation:** Add 2-3 screenshots of the Owner Today view, Comandas view, and PDV flow at 1280x720 or 1920x1080. Place in `public/screenshots/`. Add `"form_factor": "narrow"` for mobile. Same for `manifest-lite.json`.
- **Effort:** S (2-3 hours — capture 3-5 screenshots + resize + update manifests)

---

### MOB-006 — `ConnectionBanner` Text May Overflow on Narrow Screens

- **ID:** MOB-006
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - `connection-banner.tsx:59-63` — text "Sem conexão — os dados podem estar defasados" inside flex container with `text-sm` (14px) and `px-4` (16px padding)
  - At 360px: available text width = 360 - 32px (padding) - 16px (icon) - 8px (gap) = 304px
  - Text "Sem conexão — os dados podem estar defasados" at 14px Outfit ≈ 290px — fits but tightly
  - The reconnected banner: "Reconectado!" is short, no issue
  - No `truncate`, `text-wrap`, or `overflow-hidden` on the text element
  - On smaller screens (~320px width) or with larger system font scaling, this text will overflow horizontally
- **Impact:** On 320px devices (iPhone SE 1st gen) or when font size is increased via accessibility settings, the banner text overflows its container, potentially causing a horizontal scrollbar or hidden text.
- **Recommendation:** Add `text-wrap: balance` (for the text to break naturally) or `truncate` class to the banner text. Add `overflow-hidden` to the container. For the longer "disconnected" message, consider a shorter mobile variant: "Sem conexão — dados defasados".
- **Effort:** S (30 minutes — add truncate/text-wrap class + test at 320px)

---

### MOB-007 — `grid-cols-2` for Owner Comandas Filters May Wrap Poorly

- **ID:** MOB-007
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - `owner-comandas-view-sections.tsx` — `OwnerComandasResponsibleFilters` and `OwnerComandasFilterBar` (not read but inferred from view)
  - `owner-comandas-view.tsx:108-113` — 4 filter UI sections stacked vertically: `OwnerComandasStatusBanner`, `OwnerComandasHero`, `OwnerComandasFilterBar`, `OwnerComandasResponsibleFilters`
  - All within `p-3 sm:p-4` container
  - The hero uses `OwnerComandasViewHeader` which packs KPI summary tiles
  - At 360px, multiple horizontal filter chip groups may force horizontal scrolling or wrapping into awkward layouts
  - `mobile-table-grid.tsx:121` — summary tiles use `grid-cols-4` (4 columns) at all breakpoints. At 360px each tile = ~85px, and each contains text labels. The tile "Em uso" at 10px text is tight but functional.
- **Impact:** On 360px screens, the comandas filter bar with 3 filter chips + responsible filter dropdowns may break into multiple lines, pushing the actual comanda list down and requiring scroll to see content. The 4-column table grid summary tiles work but are tight.
- **Recommendation:** Test the Comandas view on 360px. If filter chips overflow, change to a horizontally scrollable row pattern (already used in MobileOrderBuilder for categories). For the table grid summary, consider `grid-cols-2` below 400px.
- **Effort:** S (1-2 hours — add responsive grid variants + test on emulated 360px)

---

### MOB-008 — Bottom Nav Shadow Hardcoded for Dark Mode

- **ID:** MOB-008
- **Severity:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - `staff-mobile-shell-bottom-nav.tsx:77` — `shadow-[0_-8px_24px_rgba(0,0,0,0.6)]` — hardcoded dark shadow
  - `owner-mobile-shell-bottom-nav.tsx:93` — `shadow-[0_-8px_24px_rgba(0,0,0,0.6)]` — same hardcoded dark shadow
  - In light mode (`--bg: #f8fafc`), a `rgba(0,0,0,0.6)` shadow looks extremely harsh and unnatural — a lighter shadow like `rgba(0,0,0,0.08)` would be appropriate
  - The `--shadow-panel` and `--shadow-panel-strong` CSS variables are defined for both light and dark modes (globals.css:104-131) but are not used in the bottom nav
- **Impact:** In light mode, the bottom nav casts an unnaturally dark shadow (`rgba(0,0,0,0.6)`) against a light background, looking like a rendering artifact rather than intentional UI elevation. Aesthetic issue only — no functional impact.
- **Recommendation:** Use `var(--shadow-panel-strong)` or a light-mode-aware shadow: `shadow-[0_-8px_24px_var(--shadow-color, rgba(0,0,0,0.6))]` with `--shadow-color` set differently in `.dark` and `:root`. Or define `--nav-shadow` CSS variable in globals.css.
- **Effort:** S (30 minutes — CSS variable definition + 2 file edits)

---

### MOB-009 — Barcode Scanner: No Torch/Flashlight Toggle

- **ID:** MOB-009
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - `owner-barcode-scanner-sheet.tsx:134-141` — video constraints request `facingMode: { ideal: 'environment' }` but no `torch` or `advanced` torch constraints
  - Scanner UI has retry and close buttons but no torch toggle
  - Barcode scanning in low-light restaurant environments (storage rooms, bars) is difficult without flashlight
  - The `MediaStreamTrack.applyConstraints()` API supports `torch: true` on supported devices (most Android Chrome)
  - iOS Safari has limited torch control through getUserMedia but it is available in some PWA contexts
- **Impact:** In low-light environments common in restaurants (stock rooms, bars, evening service), the barcode scanner may fail to detect codes. Users must rely on manual EAN input or use a separate flashlight — degrading the purpose of the mobile scanner.
- **Recommendation:** Add a torch toggle button to the scanner UI when the active track supports `torch` constraint. Check `track.getCapabilities().torch` and use `track.applyConstraints({ advanced: [{ torch: true }] })`. Add a Lightning icon button. Gracefully hide/show based on capability.
- **Effort:** S (2-3 hours — add torch check + toggle button + test on Android Chrome)

---

### MOB-010 — Kanban Goes to Single Column at 640px; Should Be Scrollable Horizontal Option

- **ID:** MOB-010
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Evidence:**
  - `lab.css:793-796` — at ≤640px, `.lab-kanban` switches to `grid-template-columns: 1fr`
  - 4 kanban columns stacked vertically on mobile: users must scroll 4+ screens to see all statuses
  - No horizontal scroll option for the kanban at mobile breakpoints
  - The PDV lite kanban (`lite-pdv-kanban.tsx`) is a demo component with hardcoded data — real PDV app uses `owner-mobile-pdv-tab.tsx` which is not a kanban
  - The real PDV builder view (`owner-mobile-pdv-tab-sections.tsx`) handles products/orders differently
- **Impact:** If the kanban pattern is meant to be used on mobile (lite PWA), stacking 4 columns vertically makes cross-column comparison difficult. Users must memorize card positions while scrolling. The trade-off is intentional (vertical layout avoids horizontal scroll) but a horizontally scrollable kanban with sticky headers is a common mobile pattern.
- **Recommendation:** For the lite kanban at ≤640px, consider a horizontally scrollable layout (`overflow-x: auto` with `grid-auto-flow: column` and grid-auto-columns: 280px) instead of stacked single-column. Add snap-scroll for cards. This provides both overview (horizontal scroll) and detail (tap to expand).
- **Effort:** M (3-5 hours — CSS refactor + test on mobile browsers)

---

## Resilience Assessment

| Concern | Status | Notes |
|---|---|---|
| Offline mode (products/actions) | STRONG | IndexedDB + Background Sync + TTL + SW message bridge |
| Offline mode (read-only views) | ADEQUATE | Polling fallback at 20s when disconnected; cached data via TanStack Query |
| Connection status visibility | STRONG | ConnectionBanner with 5s delay, reconnect confirmation, realtime LED in header |
| PWA installability | STRONG | 2 manifests, standalone display, shortcuts, launch_handler, beforeinstallprompt handler |
| Safe-area handling | STRONG | All fixed elements use `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` |
| Pull-to-refresh | STRONG | Custom touch handler with logarithmic resistance + visual indicator |
| Haptic feedback | ADEQUATE | Utility exists (haptic.ts) with 5 patterns but `btn-haptic` CSS class not globally defined |
| Barcode scanner resilience | STRONG | Dual path (BarcodeDetector API + @zxing), camera permission handling, HTTPS guard, all states handled |
| Touch target compliance | PARTIAL | Bottom nav items OK (53.6px), but 5+ buttons at 36-40px violate 48px minimum |
| Focus visibility | WEAK | No focus-visible on mobile nav, table grid cards; only shared Button component has it |
| Small screen (360px) layout | ADEQUATE | Owner 6-col nav tight but functional; content pages use padding appropriately |
| Dark/light mode consistency | STRONG | Two theme systems both have light/dark; bottom nav shadow hardcoded for dark only |
| WCAG color contrast | ADEQUATE | Primary text excellent (15:1+); 10px labels at text-soft pass AA (4.8:1); fallback color fails (3.0:1) |

---

## What's Working Well

1. **Bottom navigation pattern** — Appropriate for both shells with safe-area inset, active indicators, badge counts, and haptic-ready scale transitions. The staff 4-column nav is well-proportioned for all screen sizes.

2. **PWA configuration** — Both manifests are feature-complete (shortcuts, launch_handler, handle_links, edge_side_panel). The `OwnerPwaInstallPrompt` correctly handles both Chrome's `beforeinstallprompt` and iOS Safari's "Add to Home Screen" hint paths. SessionStorage dismissal prevents nagging.

3. **Offline queue architecture** — IndexedDB with transactional reads/writes, Background Sync registration, TTL-based expiry (10 min), SW message bridging for DRAIN_QUEUE, and atomic delete-after-success semantics. The `useOfflineQueue` hook has a clean enqueue/drain/listQueue API.

4. **Barcode scanner dual-path** — Prioritizes native BarcodeDetector API (Chrome, lower latency) with @zxing/browser fallback. Handles 5 barcode formats (EAN-13/8, UPC-A/E, Code-128). Proper cleanup on unmount. Full lifecycle handling (idle → starting → ready → unsupported → error). All error messages and UI in Portuguese.

5. **Connection awareness** — `ConnectionBanner` with 5s debounce prevents flicker, reconnected confirmation displays for 2.5s, realtime status LED in both mobile headers. `isOffline` prop threaded to almost every view for context-appropriate empty states.

6. **Safe-area + viewport** — Every fixed element (bottom nav, scanner sheet, checkout dock, install prompt) uses `env(safe-area-inset-bottom)`. Header uses `env(safe-area-inset-top)`. Viewport configured with `viewportFit: 'cover'` for edge-to-edge display.

7. **Virtual scrolling** — `MobileOrderBuilder` uses `@tanstack/react-virtual` with overscan=6 and dynamic measurement (measureElement). Estimated at 92px per item, actual measured from DOM. This handles 100+ products smoothly.

8. **Touch CSS optimizations** — `pointer: coarse` media query globally enforces 44px min touch targets and 48px input heights. `hover: none` queries suppress hover transform effects to prevent sticky states on touch. `webkit-overflow-scrolling: touch` and `overscroll-behavior: contain` applied to scroll containers.

9. **Reduced motion support** — Comprehensive `prefers-reduced-motion: reduce` block disables all animations (skeleton shimmer, card rotate, focus pulse, AI glyphs, map pulse) with `!important`.

10. **Theme token architecture** — CSS variables for all design tokens with separate light/dark blocks in both globals.css and lab.css. The `[data-lab]` adapter remaps lab tokens to the shared variable names, allowing desktop components to render correctly inside the design-lab. Theme toggle button has full-width and compact variants with proper ARIA labels.

